# bkt_and_dkt.py
# Requires: numpy, torch
# pip install numpy torch

import math
import random
import numpy as np
from typing import List, Tuple

# ---------------------
# BKT implementation
# ---------------------
class BKTModel:
    """
    Classic single-skill BKT:
      params: p_init, p_trans, slip, guess
      - absorbing learned state (if L_t=1 then L_{t+1}=1)
    """

    def __init__(self, p_init=0.1, p_trans=0.1, slip=0.1, guess=0.2):
        #set parameters
        self.p_init = float(p_init)
        self.p_trans = float(p_trans)
        self.slip = float(slip)
        self.guess = float(guess)

    def simulate_student(self, length: int, seed=None) -> List[int]:
        """Simulate a single student sequence of correctness (0/1)."""
        #initate initial skills
        if seed is not None:
            random.seed(seed)
        L = 1 if random.random() < self.p_init else 0
        obs = []
        for t in range(length):
            # observation for that the student answers correctly on current question
            if L == 1:
                prob_correct = 1.0 - self.slip
            else:
                prob_correct = self.guess
            c = 1 if random.random() < prob_correct else 0
            obs.append(c)
            # transition: if not learned, might learn 
            if L == 0 and random.random() < self.p_trans:
                L = 1
            # if L==1, stay learned (absorbing)
        return obs

    def simulate_dataset(self, n_students: int, seq_len: int, rng_seed=None) -> List[List[int]]:
        if rng_seed is not None:
            random.seed(rng_seed)
        return [self.simulate_student(seq_len) for _ in range(n_students)]

    # --------------------------
    # Forward-backward for HMM
    # --------------------------
    def _obs_prob(self, c, L):
        """P(C=c | L)"""
        if L == 1:
            return (1.0 - self.slip) if c == 1 else self.slip
        else:
            return self.guess if c == 1 else (1.0 - self.guess)

    def forward_backward(self, seq: List[int]):
        """Compute forward and backward messages and posteriors for one sequence.
           Returns alpha, beta, gamma (posterior of L_t=1), xi (expected transitions 0->1 at t).
        """
        T = len(seq)
        # states 0 and 1
        # forward alpha_t(s) = P(C_1..C_t, L_t = s)
        alpha = np.zeros((T, 2))
        # init
        alpha[0, 1] = self.p_init * self._obs_prob(seq[0], 1)
        alpha[0, 0] = (1 - self.p_init) * self._obs_prob(seq[0], 0)
        # scale to avoid underflow
        for t in range(1, T):
            c = seq[t]
            # from previous states:
            # if previous was 1, next is 1 (absorbing)
            # P(L_t=1) = alpha[t-1,1]*1 + alpha[t-1,0]*p_trans
            alpha[t, 1] = (alpha[t-1,1] * 1.0 + alpha[t-1,0] * self.p_trans) * self._obs_prob(c, 1)
            # P(L_t=0) = only possible from previous 0 and no learn
            alpha[t, 0] = (alpha[t-1,0] * (1.0 - self.p_trans)) * self._obs_prob(c, 0)
            # normalization maybe small; keep absolute values for backward correctness
        # backward
        beta = np.zeros((T, 2))
        beta[T-1, :] = 1.0
        for t in range(T-2, -1, -1):
            c_next = seq[t+1]
            # compute contributions to beta[t,s] = sum_{s'} P(L_{t+1}=s'|L_t=s) * P(C_{t+1}|s') * beta[t+1,s']
            # for s=1:
            #   from s=1 -> s'=1 with prob 1.0
            beta[t, 1] = 1.0 * self._obs_prob(c_next, 1) * beta[t+1, 1]
            # for s=0:
            #   s'=1 with p_trans
            #   s'=0 with (1-p_trans)
            beta[t, 0] = (self.p_trans * self._obs_prob(c_next, 1) * beta[t+1, 1] +
                          (1.0 - self.p_trans) * self._obs_prob(c_next, 0) * beta[t+1, 0])
        # gamma (posterior P(L_t = 1 | seq))
        gamma = np.zeros(T)
        for t in range(T):
            numer1 = alpha[t,1] * beta[t,1]
            numer0 = alpha[t,0] * beta[t,0]
            denom = numer0 + numer1
            if denom == 0:
                gamma[t] = 0.0
            else:
                gamma[t] = numer1 / denom
        # xi: expected # transitions from 0->1 at time t (i.e., from L_t=0 to L_{t+1}=1)
        xi = np.zeros(T-1)
        for t in range(T-1):
            c_next = seq[t+1]
            # joint prob proportional to alpha[t,0] * P(L_{t+1}=1|L_t=0)=p_trans * P(C_{t+1}|1) * beta[t+1,1]
            numer = alpha[t,0] * self.p_trans * self._obs_prob(c_next, 1) * beta[t+1,1]
            denom = (alpha[t,0] * self._obs_prob(seq[t],0) * beta[t,0] if False else
                     (alpha[t,0]*beta[t,0] + alpha[t,1]*beta[t,1]))  # not used; compute normalization below
            # instead compute sum over s,s' of alpha[t,s]*P(s->s')*P(obs_{t+1}|s')*beta[t+1,s']
            denom_sum = (
                alpha[t,0] * ( (1.0-self.p_trans) * self._obs_prob(c_next, 0) * beta[t+1,0]
                              + self.p_trans * self._obs_prob(c_next, 1) * beta[t+1,1] )
                + alpha[t,1] * (1.0 * self._obs_prob(c_next, 1) * beta[t+1,1])
            )
            xi[t] = (numer / denom_sum) if denom_sum != 0 else 0.0
        return alpha, beta, gamma, xi

    def fit(self, sequences: List[List[int]], n_iters=15, verbose=False):
        """
        Fit parameters with EM (Baum-Welch) using multiple sequences (list of lists of 0/1).
        """
        for it in range(n_iters):
            # expected counts
            sum_gamma0 = 0.0   # expected times in state 0
            sum_gamma1 = 0.0   # expected times in state 1
            sum_init1 = 0.0
            sum_trans_0_to_1 = 0.0  # expected transitions 0->1
            sum_correct_in_state1 = 0.0
            sum_state1 = 0.0
            sum_correct_in_state0 = 0.0
            sum_state0 = 0.0

            for seq in sequences:
                if len(seq) == 0:
                    continue
                alpha, beta, gamma, xi = self.forward_backward(seq)
                T = len(seq)
                sum_init1 += gamma[0]
                sum_gamma1 += gamma.sum()
                sum_gamma0 += (T - gamma.sum())
                # expected transitions
                sum_trans_0_to_1 += xi.sum()
                # expected observation counts
                # for state1: expected number of times in state1 and response correct
                for t, c in enumerate(seq):
                    if gamma[t] > 0:
                        if c == 1:
                            sum_correct_in_state1 += gamma[t]
                        sum_state1 += gamma[t]
                        sum_state0 += (1.0 - gamma[t])
                        if c == 1:
                            sum_correct_in_state0 += (1.0 - gamma[t])
                    else:
                        # gamma[t]==0 -> contribution to state0 only
                        sum_state0 += 1.0
                        if c == 1:
                            sum_correct_in_state0 += 1.0
            # M-step updates
            new_p_init = (sum_init1 / len(sequences)) if len(sequences) > 0 else self.p_init
            new_p_trans = (sum_trans_0_to_1 / max(1e-8, sum_gamma0))  # expected transitions / expected times in 0
            new_slip = 1.0 - (sum_correct_in_state1 / max(1e-8, sum_state1))
            new_guess = (sum_correct_in_state0 / max(1e-8, sum_state0))
            # clip to (tiny, 1-tiny)
            eps = 1e-6
            self.p_init = float(min(max(new_p_init, eps), 1-eps))
            self.p_trans = float(min(max(new_p_trans, eps), 1-eps))
            self.slip = float(min(max(new_slip, eps), 1-eps))
            self.guess = float(min(max(new_guess, eps), 1-eps))
            if verbose:
                print(f"EM iter {it+1}: p_init={self.p_init:.4f}, p_trans={self.p_trans:.4f}, slip={self.slip:.4f}, guess={self.guess:.4f}")

    def predict_mastery_after_sequence(self, seq: List[int]) -> float:
        """Return P(L_T = 1 | observations seq) — posterior mastery after observed seq."""
        if len(seq) == 0:
            return self.p_init
        _, _, gamma, _ = self.forward_backward(seq)
        return float(gamma[-1])

    def predict_next_correct_prob(self, seq: List[int]) -> float:
        """Predict P(next response correct | observed seq)."""
        p_mastery = self.predict_mastery_after_sequence(seq)
        # next-step mastery: if not learned, can learn with p_trans before next observation?
        # Classic BKT assumes learning happens after an opportunity; here we predict on next opportunity:
        # If the learning occurs *between* steps, you might update. We'll assume prediction before next learning:
        p_correct = p_mastery * (1.0 - self.slip) + (1.0 - p_mastery) * self.guess
        return p_correct

# ---------------------
# DKT (PyTorch) implementation
# ---------------------
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

class SeqDataset(Dataset):
    """
    sequences: list of sequences, where each sequence is list of (skill_idx, correct)
    K: number of skills
    The input x_t is a one-hot vector of size 2*K: index = skill*2 + correct
    The target at time t is correctness at time t+1 for skill at t+1 (shifted).
    We produce padded tensors with mask.
    """
    def __init__(self, sequences: List[List[Tuple[int,int]]], K: int):
        self.sequences = sequences
        self.K = K

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        seq = self.sequences[idx]
        # build x (length T) and target_next (length T): for t, target is correctness at t+1
        T = len(seq)
        x = np.zeros((T, 2*self.K), dtype=np.float32)
        target = np.zeros(T, dtype=np.float32)
        target_skill = np.zeros(T, dtype=np.int64)
        mask = np.zeros(T, dtype=np.float32)
        for t in range(T):
            skill, corr = seq[t]
            x[t, skill*2 + corr] = 1.0
        # produce shifted targets: for t from 0..T-2, target[t] = correctness at t+1 for skill_{t+1}
        for t in range(T-1):
            next_skill, next_corr = seq[t+1]
            target[t] = next_corr
            target_skill[t] = next_skill
            mask[t] = 1.0
        # last time step has no next question -> mask=0
        return torch.from_numpy(x), torch.from_numpy(target), torch.from_numpy(target_skill), torch.from_numpy(mask)

def collate_fn(batch):
    # pads sequences to max_len in batch
    xs, targets, target_skills, masks = zip(*batch)
    lengths = [x.shape[0] for x in xs]
    maxL = max(lengths)
    B = len(xs)
    dim = xs[0].shape[1]
    X = torch.zeros(B, maxL, dim, dtype=torch.float32)
    T = torch.zeros(B, maxL, dtype=torch.float32)  # targets float
    SK = torch.zeros(B, maxL, dtype=torch.long)
    M = torch.zeros(B, maxL, dtype=torch.float32)
    for i in range(B):
        L = lengths[i]
        X[i, :L, :] = xs[i]
        T[i, :L] = targets[i]
        SK[i, :L] = target_skills[i]
        M[i, :L] = masks[i]
    return X, T, SK, M, lengths

class DKT(nn.Module):
    def __init__(self, input_size, hidden_size, K, num_layers=1, dropout=0.1):
        super().__init__()
        self.rnn = nn.LSTM(input_size, hidden_size, num_layers=num_layers, batch_first=True, dropout=dropout)
        self.out = nn.Linear(hidden_size, K)  # predict logits per skill

    def forward(self, x, lengths=None):
        # x: (B, T, input_size)
        packed_out, _ = self.rnn(x)  # returns all outputs (B, T, hidden)
        logits = self.out(packed_out)  # (B, T, K)
        return logits

def train_dkt(model, dataloader, epochs=10, lr=0.001, device='cpu', verbose=True):
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    bce = nn.BCEWithLogitsLoss(reduction='none')
    model.to(device)
    for ep in range(1, epochs+1):
        model.train()
        total_loss = 0.0
        total_count = 0.0
        for X, T, SK, M, lengths in dataloader:
            X = X.to(device)
            T = T.to(device)
            SK = SK.to(device)
            M = M.to(device)
            logits = model(X)  # (B, T, K)
            # pick logits at each time for the *next skill* index SK
            # create gather index
            B, Tmax, K = logits.shape
            # gather logits for the next skill
            idx = SK.unsqueeze(-1)  # (B,T,1)
            chosen_logits = torch.gather(logits, dim=2, index=idx).squeeze(-1)  # (B,T)
            loss_mat = bce(chosen_logits, T) * M  # masked
            loss = loss_mat.sum() / (M.sum()+1e-8)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total_loss += loss.item() * (M.sum().item())
            total_count += M.sum().item()
        avg_loss = total_loss / max(1.0, total_count)
        if verbose:
            print(f"Epoch {ep}/{epochs} avg masked BCE: {avg_loss:.4f}")
    return model

def evaluate_dkt(model, dataloader, device='cpu'):
    model.eval()
    bce = nn.BCEWithLogitsLoss(reduction='none')
    total_loss = 0.0
    total_count = 0.0
    with torch.no_grad():
        for X, T, SK, M, lengths in dataloader:
            X = X.to(device); T=T.to(device); SK=SK.to(device); M=M.to(device)
            logits = model(X)
            chosen_logits = torch.gather(logits, dim=2, index=SK.unsqueeze(-1)).squeeze(-1)
            loss_mat = bce(chosen_logits, T) * M
            total_loss += loss_mat.sum().item()
            total_count += M.sum().item()
    return total_loss / max(1.0, total_count)

def simulate_with_dkt(model, skill_sequence: List[int], device='cpu', stochastic=True):
    """
    Given a sequence of skills to ask, simulate a student by feeding inputs step-by-step.
    If stochastic=True, sample Bernoulli outcomes from model probabilities;
    else deterministically use probability>0.5.
    """
    model.eval()
    K = model.out.out_features
    inp_dim = model.rnn.input_size
    # initial hidden state is zeros automatically
    responses = []
    # we need to iteratively feed skill+response encoding
    x_t = None
    # maintain hidden state by running RNN one step at a time
    h = None
    c = None
    with torch.no_grad():
        for t, skill in enumerate(skill_sequence):
            if t == 0:
                # no prior response -> feed zero vector (or initial guess)
                x_vec = torch.zeros(1, 1, inp_dim, device=device)
            else:
                prev_skill = skill_sequence[t-1]
                prev_resp = responses[-1]
                x_vec = torch.zeros(1, 1, inp_dim, device=device)
                x_vec[0,0, prev_skill*2 + prev_resp] = 1.0
            # run one step through LSTM cell: use model.rnn directly is tricky for single step; use full RNN on current input and prev hidden
            out, (h, c) = model.rnn(x_vec, (h, c)) if h is not None else model.rnn(x_vec)
            logits = model.out(out)  # (1,1,K)
            prob = torch.sigmoid(logits[0,0, skill]).item()
            if stochastic:
                resp = 1 if random.random() < prob else 0
            else:
                resp = 1 if prob >= 0.5 else 0
            responses.append(resp)
    return responses

# ---------------------
# Demo pipeline (simulate with BKT, train DKT)
# ---------------------
if __name__ == "__main__":
    # 1) Simulate dataset with BKT for one skill or multiple skills
    # For clarity: build a multiple-skill dataset by using independent BKT per skill.
    random.seed(0); np.random.seed(0)
    K = 5  # number of skills
    students = 200
    seq_len = 30
    # create one BKT per skill with random params
    bkts = [BKTModel(p_init=0.1+0.1*i, p_trans=0.05+0.02*i, slip=0.05, guess=0.2) for i in range(K)]
    data_sequences = []
    for s in range(students):
        # create an interleaved skill sequence: sample a skill each time
        seq = []
        for t in range(seq_len):
            skill = random.randrange(K)
            # simulate response for that skill by calling its BKT simulate_student but single-step
            # we'll maintain per-student per-skill hidden state by sampling a sequence per student-skill
            # Simpler: independently simulate sequences per student per skill and pick next item from that skill's sequence
            seq.append((skill, bkts[skill].simulate_student(1)[0]))
        data_sequences.append(seq)

    # 2) Prepare sequences in the format (skill, correct) and train DKT
    ds = SeqDataset(data_sequences, K)
    loader = DataLoader(ds, batch_size=32, shuffle=True, collate_fn=collate_fn)
    model = DKT(input_size=2*K, hidden_size=64, K=K)
    print("Training DKT on BKT-generated synthetic data...")
    train_dkt(model, loader, epochs=6, lr=0.005, device='cpu')

    # 3) Simulate a student from the trained DKT over a fixed skill sequence
    skill_seq = [0,1,2,3,4,0,1,2,3,4]
    sim_resp = simulate_with_dkt(model, skill_seq, stochastic=True)
    print("Simulated responses from DKT:", sim_resp)

    # 4) Example BKT fit from observed sequences (single-skill example)
    # Build single-skill sequences from skill 0 only
    ss = []
    for seq in data_sequences:
        # filter to skill 0
        s0 = [c for (k,c) in seq if k==0]
        if len(s0) >= 3:
            ss.append(s0)
    print(f"Fitting BKT to {len(ss)} sequences (skill 0).")
    b = BKTModel(p_init=0.2, p_trans=0.05, slip=0.1, guess=0.2)
    b.fit(ss, n_iters=10, verbose=True)
    # predict
    example_seq = ss[0]
    print("Example sequence (skill 0):", example_seq[:10])
    print("Posterior mastery after seq:", b.predict_mastery_after_sequence(example_seq))
    print("Predicted next correct prob:", b.predict_next_correct_prob(example_seq))
