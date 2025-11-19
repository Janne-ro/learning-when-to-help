#imports
import math
import random
import numpy as np
from typing import List, Tuple
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from typing import List, Dict, Any, Optional

#class for the BKT implementation
class BKTModel:

    def __init__(self, p_init=0.1, p_trans=0.1, slip=0.1, guess=0.2):
        #set parameters
        self.p_init = float(p_init)
        self.p_trans = float(p_trans)
        self.slip = float(slip)
        self.guess = float(guess)

    #simulate a single student sequence of correctness (0/1)
    #outputs a list of 0/1 of given length representing correctness on tasks (does not allow for reattempts here --> logic in multi-skill BKT)
    def simulate_student(self, length: int, difficulties = None, seed=None) -> List[int]:

        #initate seeds
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        #fill up difficulties if none given (slip and guess is not scaled)
        if difficulties == None:
            difficulties = [1.0 for _ in range(length)]

        #initalize mastery according to p_init    
        if random.random() < self.p_init:
            L = 1 
        else:
            L = 0

        #initalize the observations of the student 
        obs = []
        for t in range(length):

            #get current difficulties and effective slip and guess
            difficulty = difficulties[t]
            effective_slip = min(max(self.slip * difficulty, 1e-6),1-1e-6)
            effective_guess = min(max(self.guess / difficulty, 1e-6),1-1e-6)

            #observation for that the student answers correctly on current question
            if L == 1:
                prob_correct = 1.0 - effective_slip
            else:
                prob_correct = effective_guess

            #sample one observation
            if random.random() < prob_correct:
                c = 1 
            else:
                c = 0
            obs.append(c)

            #do one transition step 
            if L == 0 and random.random() < self.p_trans:
                L = 1

            #if L==1, stay learned (implementation without forgetting since to small sequence lengths, only 9)
        return obs

    #simulate multiple students
    def simulate_dataset(self, n_students: int, seq_len: int, seed=None) -> List[List[int]]:
        if seed is not None:
            random.seed(seed)
        return [self.simulate_student(seq_len) for _ in range(n_students)]

    #function to compute probability of observation c given latent state L (needed for forward-backward)
    #add a dificulty parameter that modifies slip and guess
    def _obs_prob(self, c, L, difficulty=1.0):

        # scale slip and guess by difficulty (Heffernan et al., 2011)
        effective_slip = min(max(self.slip * difficulty, 1e-6), 1-1e-6)
        effective_guess = min(max(self.guess / difficulty, 1e-6), 1-1e-6)

        if L == 1:
            if c == 1:
                return (1.0 - effective_slip) 
            else:
                return effective_slip
        else:
            if c == 1:
                return effective_guess 
            else:
                return 1.0 - effective_guess
            
    #Forward-backward (EM) algorithm for HMM --> also only needed when fitting parameters given an observation
    #compute forward and backward messages and posteriors for one sequence.
    #returns alpha, beta, gamma (posterior of L_t=1), xi (expected transitions 0->1 at t)
    def forward_backward(self, seq: List[int], difficulties: List[float] = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        
        # set difficulties to 1 if none given
        if difficulties is None:
            difficulties = [1.0 for _ in range(len(seq))]

        #read out the length of the sequence 
        len_seq = len(seq)

        #calculate forward alpha_t(s) = P(C_1..C_t, L_t = s)
        alpha = np.zeros((len_seq, 2))
        # initalize alpha_0
        alpha[0, 1] = self.p_init * self._obs_prob(seq[0], 1, difficulties[0])
        alpha[0, 0] = (1 - self.p_init) * self._obs_prob(seq[0], 0, difficulties[0])

        # forward pass to calculate alpha_t
        for t in range(1, len_seq):
            #observation at time t
            c = seq[t]
            #iterativly apply formula
            #if previous was 1, next is 1 (no forgetting)
            #P(L_t=1) = alpha[t-1,1]*1 + alpha[t-1,0]*p_trans
            alpha[t, 1] = (alpha[t-1,1] * 1.0 + alpha[t-1,0] * self.p_trans) * self._obs_prob(c, 1, difficulties[t])
            #P(L_t=0) = only possible from previous 0 and no learn
            alpha[t, 0] = (alpha[t-1,0] * (1.0 - self.p_trans)) * self._obs_prob(c, 0, difficulties[t])

        #calculate backward beta_t(s) = P(C_t..C_T, L_t = s)
        beta = np.zeros((len_seq, 2))
        #initalize alpha_T
        beta[len_seq-1, :] = 1.0

        #backward pass to calculate beta_t
        for t in range(len_seq-2, -1, -1):

            #observation at time t+1
            c_next = seq[t+1]

            #iterativly apply formula
            #forgetting irrelevant here in backwards
            beta[t, 1] = 1.0 * self._obs_prob(c_next, 1, difficulties[t]) * beta[t+1, 1]
            #for s=0: s'=1 with p_trans and s'=0 with (1-p_trans)
            beta[t, 0] = (self.p_trans * self._obs_prob(c_next, 1, difficulties[t]) * beta[t+1, 1] +
                          (1.0 - self.p_trans) * self._obs_prob(c_next, 0, difficulties[t]) * beta[t+1, 0])
        
        #calculate gamma based on values for alpha and beta (posterior P(L_t = 1 | seq))

        #initalize gamma 
        gamma = np.zeros(len_seq)

        #iterate through sequence to calculate gamma_t according to formula 
        for t in range(len_seq):
            denominator = (alpha[t,0] * beta[t,0]) + (alpha[t,1] * beta[t,1])
            #check if denominator is zero to avoid division by zero
            if denominator == 0:
                gamma[t] = 0.0
            else:
                gamma[t] = (alpha[t,1] * beta[t,1]) / denominator

        # calculate xi: expected nr of transitions from 0->1 at time t (i.e., from L_t=0 to L_{t+1}=1)
        # sum_j xi(i,j) = gamma(i)
        #initalize xi
        xi = np.zeros(len_seq-1)

        #iterate through sequence to calculate xi_t according to formula
        for t in range(len_seq-1):

            #observation at time t+1
            c_next = seq[t+1]

            #according to forward-backward formula:
            # joint prob proportional to alpha[t,0] * P(L_{t+1}=1|L_t=0)=p_trans * P(C_{t+1}|1) * beta[t+1,1]
            nominator = alpha[t,0] * self.p_trans * self._obs_prob(c_next, 1, difficulties[t]) * beta[t+1,1]
            #compute sum over s,s' of alpha[t,s]*P(s->s')*P(obs_{t+1}|s')*beta[t+1,s']
            denominator = (
                alpha[t,0] * ( (1.0-self.p_trans) * self._obs_prob(c_next, 0, difficulties[t]) * beta[t+1,0]
                              + self.p_trans * self._obs_prob(c_next, 1, difficulties[t]) * beta[t+1,1] )
                + alpha[t,1] * (1.0 * self._obs_prob(c_next, 1, difficulties[t]) * beta[t+1,1])
            )

            #check if denominator is zero to avoid division by zero
            if denominator == 0:
                xi[t] = 0.0
            else:
                xi[t] = nominator / denominator

        #return all computed values (only gamma and xi needed for Baum-Welch EM)
        return alpha, beta, gamma, xi

    #Fit parameters with EM (Baum-Welch) using multiple sequences (list of lists of 0/1) --> acutally unneded as we do not have student data here
    def fit(self, sequences: List[List[int]], n_iters=15, telling=False):
        for it in range(n_iters):
            #initalize variables to accumulate expected counts
            sum_gamma0 = 0.0   # expected times in state 0
            sum_gamma1 = 0.0   #expected times in state 1
            sum_init1 = 0.0  #expected initial state 1
            sum_trans_0_to_1 = 0.0  #expected transitions 0->1
            sum_correct_in_state1 = 0.0 #expected correct responses in state 1
            sum_state1 = 0.0  #expected times in state 1
            sum_correct_in_state0 = 0.0  #expected correct responses in state 0
            sum_state0 = 0.0  # expected times in state 0

            #E-step: compute expected counts
            #iterate through all sequences
            for seq in sequences:

                #ignore if sequence length is zero
                if len(seq) == 0:
                    continue

                #get results from forward-backward and update sums
                alpha, beta, gamma, xi = self.forward_backward(seq)
                len_seq = len(seq)
                sum_init1 += gamma[0]
                sum_gamma1 += gamma.sum()
                sum_gamma0 += (len_seq - gamma.sum())
                sum_trans_0_to_1 += xi.sum() #expected transitions
                #expected observation counts
                #for state1: expected number of times in state1 and response correct

                #iterate through current sequence 
                for t, c in enumerate(seq):

                    #update sums according to gamma_t (formulas for expected counts)
                    if gamma[t] > 0:
                        if c == 1:
                            sum_correct_in_state1 += gamma[t]
                        sum_state1 += gamma[t]
                        sum_state0 += (1.0 - gamma[t])
                        if c == 1:
                            sum_correct_in_state0 += (1.0 - gamma[t])
                    else:
                        # gamma[t]==0 --> contribution to state0 only
                        sum_state0 += 1.0
                        if c == 1:
                            sum_correct_in_state0 += 1.0

            #M-step updates according to formulas 
            new_p_init = (sum_init1 / len(sequences)) if len(sequences) > 0 else self.p_init
            new_p_trans = (sum_trans_0_to_1 / max(1e-8, sum_gamma0))  # expected transitions / expected times in 0
            new_slip = 1.0 - (sum_correct_in_state1 / max(1e-8, sum_state1))
            new_guess = (sum_correct_in_state0 / max(1e-8, sum_state0))
            # clip to avoid degenerate values
            self.p_init = float(min(max(new_p_init, 1e-6), 1-1e-6))
            self.p_trans = float(min(max(new_p_trans, 1e-6), 1-1e-6))
            self.slip = float(min(max(new_slip, 1e-6), 1-1e-6))
            self.guess = float(min(max(new_guess, 1e-6), 1-1e-6))
            #if telling print out the current vaues of the parameters
            if telling:
                print(f"EM iter {it+1}: p_init={self.p_init:.5f}, p_trans={self.p_trans:.5f}, slip={self.slip:.5f}, guess={self.guess:.5f}")

    #predict posterior mastery after observed sequence P(L_T = 1 | observations seq)
    def predict_mastery_after_sequence(self, seq):
        #if no sequence, return initial mastery
        if len(seq) == 0:
            return self.p_init
        #else return last gamma value from forward-backward (being in hidden state 1 after observing seq)
        _, _, gamma, _ = self.forward_backward(seq)
        return float(gamma[-1])

    #Predict the probability of having the next response correct P(next response correct | observed seq).
    def predict_next_correct_prob(self, seq):
        p_mastery = self.predict_mastery_after_sequence(seq)
        #basically just conditioning p_correct on p_mastery after the observed sequence 
        p_correct = p_mastery * (1.0 - self.slip) + (1.0 - p_mastery) * self.guess
        return p_correct
    

#class for the BKT implementation which allows having multiple skills requrired in one task
#includes:
#   imediate retakes until correct or probabilistic retakes that condition slip, guess and transition probabilities
#   task difficulties that condition slip and guess
class MultiSkillBKT:

    #initalize with n_skills BKT models
    def __init__(self, n_skills: int, p_init=0.1, p_trans=0.1, slip=0.1, guess=0.2):
        # Create one BKTModel per skill
        self.skills = [BKTModel(p_init, p_trans, slip, guess) for _ in range(n_skills)]
        self.n_skills = n_skills

    
    # Simulate a student sequence of responses for tasks, allowing retakes.
    # Parameters:
    #   - task_skill_map: List of tasks, each task is a list of skill indices needed for the task
    #   - seed: random seed for reproducibility
    #   - task_difficulties: Optional list of task difficulties (float) for each task
    #   - retake_until_correct: if True, retry wrong attempts until correct or max_retries reached.
    #   - max_retries: maximum number of attempts per task (including first attempt).

    #returns a dictionary with keys:
    #   - 'task' : index in task_skill_map
    #   - 'attempt' : attempt number for that task (1,2,...) 
    #   - 'skills' : list of skill indices required for that task
    #   - 'correct' : 0/1 whether the student answered correctly on that attempt
    #   - 'difficulty' : difficulty of that task
    def simulate_student(self, task_skill_map, seed = None, *, task_difficulties = None, retake_until_correct = False, max_retries = None):
        
        #set seed if given
        if seed is not None:
            random.seed(seed)

        #set task difficulties to 1 if none given
        if task_difficulties is None:
            task_difficulties = [1.0 for _ in range(len(task_skill_map))]

        # initialize per-skill mastery state based on p_init
        L = [1 if random.random() < sk.p_init else 0 for sk in self.skills]
        records: List[Dict[str, Any]] = []

        for task_idx, skills_required in enumerate(task_skill_map):
            attempt = 0
            while True:
                attempt += 1

                # compute probability correct on this attempt (independent slip/guess per skill)
                prob_correct = 1.0 

                for s in skills_required:
                    
                    #condition slip and guess by difficulty
                    effective_slip = min(max(self.skills[s].slip * task_difficulties[task_idx], 1e-6),1-1e-6)
                    effective_guess = min(max(self.skills[s].guess / task_difficulties[task_idx], 1e-6),1-1e-6)

                    #condition slip and guess by attempts 
                    SLIP_GUESS_STEP = 0.1
                    effective_slip = min(max(effective_slip * (1 - SLIP_GUESS_STEP * (attempt - 1)), 1e-6), 1-1e-6)
                    effective_guess = min(max(effective_guess * (1 + SLIP_GUESS_STEP * (attempt - 1)), 1e-6), 1-1e-6)

                    #caluclate prob_correct contribution for that skill
                    if L[s] == 1:
                        prob_correct *= (1.0 - effective_slip)
                    else:
                        prob_correct *= effective_guess

                #sample correctness for this attempt
                if random.random() < prob_correct:
                    c=1
                else:
                    c=0

                #append current attempt record
                records.append({
                    'task': task_idx,
                    'attempt': attempt,
                    'skills': list(skills_required),
                    'correct': c,
                    'difficulty': task_difficulties[task_idx]
                })

                #after each attempt, update mastery for each skill (no forgetting)
                for s in skills_required:

                    P_TRANS_STEP = 0.1

                    #condition p_trans on attempts
                    effective_p_trans = min(self.skills[s].p_trans * (1 + P_TRANS_STEP * (attempt - 1)), 1 - 1e-6)

                    if L[s] == 0 and random.random() < effective_p_trans:
                        L[s] = 1

                #decide whether to retry
                if c == 1:
                    break  #correct --> stop retrying (common policy)
                # if incorrect retry until correct or max_retries reached 
                if retake_until_correct:
                    if max_retries is None:
                        continue
                    elif attempt >= max_retries:
                        break
                    else:
                        continue
                else:
                    # no retakes if set to false
                    break

        return records


#Example task mapping
task_skill_map = [[0], [1], [0,1], [0], [1], [0,1], [0], [1], [0,1]]
difficulties = [0.6, 1, 1, 1, 1, 1, 1, 1, 2]

#initialize multi-skill BKT
ms_bkt = MultiSkillBKT(n_skills=2, p_init=0.1, p_trans=0.1, slip=0.1, guess=0.2)

# Example: retry until correct, up to 4 attempts
records = ms_bkt.simulate_student(task_skill_map, task_difficulties=difficulties, seed=43, retake_until_correct=True)

#output results 
for r in records:
    print(f"task {r['task']}, attempt {r['attempt']}, skills {r['skills']}, difficulty={r['difficulty']}, correct={r['correct']}")