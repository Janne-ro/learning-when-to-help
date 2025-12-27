#file including the environment for the rl agent using stable baselines3 gymnasium

import gymnasium as gym
from gymnasium import spaces
import numpy as np
#import bkt modules
#from bkt import BKTModel
from bkt import MultiSkillBKT

class LearningEnv(gym.Env):
    def __init__(self):

        #initlize super class
        super().__init__()

        # Define the observation space
        # 1) Failed attempts on current task (0-20)
        # 2) Time on the current task in seconds (0-10000)
        # 3) Current understanding modeled as failed attempts on previous metatask (0-100)
        # 4) Used GenAI on metatask 1 (0 or 1)
        # 5) Used GenAI on metatask 2 (0 or 1)
        # 6) Used GenAI on metatask 3 (0 or 1)
        # 7) Current metatask (0, 1, 2)
        self.observation_space = spaces.Box(
            low=np.array([0, 0, 0, 0, 0, 0, 0], dtype=np.float32),
            high=np.array([20, 10000, 20, 1, 1, 1, 2], dtype=np.float32),
            dtype=np.float32
        )
        
        # Define the action space
        #self.action_space = spaces.MultiBinary(1)  #two discrete actions (0=don't allow, 1=allow)
        self.action_space = gym.spaces.Discrete(2)

        #Define current student model
        self.student_model = None

        #Define task skill mapping and difficulties
        self.task_skill_map = [[0],[0],[0],[1],[1],[1],[2],[2],[2]] #this is done like this because inital testing involved having multiple skills per item
        self.difficulties = [1.1, 1.2, 0.9, 0.9, 0.9, 0.8, 1.1, 1.3, 0.7] #informed by pilots

        #save some things about current state
        self.current_task = 0
        self.failed_attempts_on_current_task = 0
        self.current_time = 0
        self.next_try_at = 0

        #save how many failed attempts were on each metatask
        self.failed_attempts_on_metattasks = {0 : 0, 1 : 0, 2 : 0}
        self.used_genai_on_metatask_1 = 0
        self.used_genai_on_metatask_2 = 0
        self.used_genai_on_metatask_3 = 0
        self.current_metatask = 0

        #initalize hyperparameters for pedagogical reward shaping
        self.c_succ = 10
        self.c_time = 0.1
        self.c_fp = 8
        self.alpha = 1.5
        self.beta = 4
        self.delta = 0.1
        self.T_st = 240 #4min
        self.c_mt = 10

    def skewed_scaled_beta(self, size=1, alpha = 2, beta = 4, min=60, max=240):
            y = np.random.beta(alpha, beta, size=size)  # skewed towards lower values with inital values
            #check that it doesnt return an array when size=1
            if size == 1:
                return min + (max-min) * y[0]
            return min + (max-min) * y 
    
    #resets the enviroment to an intial state with one inital student
    def reset(self, *, seed=None, options=None):
        
        #set seed if given
        if seed is not None:
            super().reset(seed=seed)

        #reset informations about current standing 
        self.failed_attempts_on_metattasks = {0 : 0, 1 : 0, 2 : 0}
        self.used_genai_on_metatask_1 = 0
        self.used_genai_on_metatask_2 = 0
        self.used_genai_on_metatask_3 = 0
        self.current_metatask = 0
        self.current_task = 0
        self.failed_attempts_on_current_task = 0
        self.current_time = 0
        self.next_try_at = float(min(max(np.random.normal(163.9, 126.2), 69.2), 417.2)) #initalize to an inital value before the first question will be answered; holds at what time the next try will occur, informed by pilot

        #generate a random student using pilot results + small variance 
        #skill1
        random_p_init_skill1 = float(min(max(np.random.normal(0.351, 0.1), 0.05), 0.95))
        random_p_trans_skill1 = float(min(max(np.random.normal(0.192, 0.05), 0.01), 0.5))
        random_slip_skill1 = float(min(max(np.random.normal(0.066, 0.03), 0.01), 0.35)) 
        random_guess_skill1 = float(min(max(np.random.normal(0.240, 0.03), 0.01), 0.35))

        #skill2
        random_p_init_skill2 = float(min(max(np.random.normal(0.05, 0.1), 0.05), 0.95))
        random_p_trans_skill2 = float(min(max(np.random.normal(0.082, 0.05), 0.01), 0.5))
        random_slip_skill2 = float(min(max(np.random.normal(0.048, 0.03), 0.01), 0.35)) 
        random_guess_skill2 = float(min(max(np.random.normal(0.350, 0.03), 0.01), 0.35))

        #skill3
        random_p_init_skill3 = float(min(max(np.random.normal(0.645, 0.1), 0.05), 0.95))
        random_p_trans_skill3 = float(min(max(np.random.normal(0.051, 0.05), 0.01), 0.5))
        random_slip_skill3 = float(min(max(np.random.normal(0.088, 0.03), 0.01), 0.35)) 
        random_guess_skill3 = float(min(max(np.random.normal(0.198, 0.03), 0.01), 0.35))

        parameter_list = [
            [random_p_init_skill1, random_p_trans_skill1, random_slip_skill1, random_guess_skill1],
            [random_p_init_skill2, random_p_trans_skill2, random_slip_skill2, random_guess_skill2],
            [random_p_init_skill3, random_p_trans_skill3, random_slip_skill3, random_guess_skill3]
        ]

        #initialize multi-skill BKT
        self.student_model = MultiSkillBKT(n_skills=3, parameters=parameter_list)

        # Reset environment state
        observation = np.array([
            self.failed_attempts_on_current_task,     # failed attempts on current task 
            self.current_time, # current time          
            0, #curerent understanding modeled as failed attempts on previous metatask        
            0, #used genAI on metatask 1
            0, #used genAI on metatask 2
            0, #used genAI on metatask 3
            0  #current metatask
        ], dtype=np.float32)

        #return student parameters in info
        info = {
            'student_params': parameter_list
        }  #Additional info
        return observation, info
    
    #function modeling the pedagogically grounded reward function (for details please refer to the paper)
    #completed_task holds wheter the student completed a task in between the last 5 sec timestep and now
    #lst_of_used_genai_on_metatasks is a list of ints [0, 0, 1] would signifiy that the agent didnt use genAI on metatask 1 and 2 but did use it on metatask 3
    def calculate_reward(self, action, completed_task, failed_attempts_on_current_task, current_time, lst_of_used_genai_on_metatasks, current_metatask):
        reward = 0.0
        #integrate R_success
        if completed_task:
            reward += self.c_succ
        #integrate R_time (at each time step negative reward to encourage fast learning)
        reward -= self.c_time

        #check that the action should have done an action here
        if action: #equivalent to action is not None

            if lst_of_used_genai_on_metatasks[current_metatask] == 1 and action == 1:
                reward -= 1 #penalize reusing genAI on same metatask
            else:
                    
                #integrate R_PF (only relevant if agent picked action 1)
                if action == 1:
                    if failed_attempts_on_current_task == 0:
                        reward -= self.c_fp
                    elif 1<=failed_attempts_on_current_task<=2:
                        reward += self.alpha * failed_attempts_on_current_task
                    else:
                        reward += self.beta * failed_attempts_on_current_task
                #integrate R_CLT
                if action == 1 and current_time < self.T_st:
                    reward -= self.delta * (self.T_st - current_time)
                #integrate R_MT
                if current_metatask == 1: #Task 2
                    resent_metatasks = [0]
                elif current_metatask == 2:
                    resent_metatasks = [0, 1]
                else:
                    resent_metatasks = []
                used_desisions = set()
                for metatask in resent_metatasks:
                    used_desisions.add(lst_of_used_genai_on_metatasks[metatask])
                if used_desisions:
                    #add reward if we havent used the task before
                    if not action in used_desisions:
                        reward += self.c_mt

        return reward

            

    
    def step(self, action, verbose = False):

        #transform action from array to int
        try:
            action = int(action[0])
        except: 
            pass

        #initalize reward
        reward = 0.0

        #identify which metatask we are in
        if 0<=self.current_task<=2:
            current_metatask = 0
        elif 3<=self.current_task<=5:
            current_metatask = 1
        else:
            current_metatask = 2
        # keep object state in sync with local variable
        self.current_metatask = current_metatask

        #set terminated and truncated variable
        terminated = False
        truncated = False  # Is episode done due to time limit or other constraint? (Not needed for this environment)

        #set wheter the student can currently use genAI on the metatask
        if current_metatask == 0:
            can_use_genAI = self.used_genai_on_metatask_1
        elif current_metatask == 1:
            can_use_genAI = self.used_genai_on_metatask_2
        else:   
            can_use_genAI = self.used_genai_on_metatask_3

        #initalize records to None
        records = None


            
        #check if there even is a try occuring
        if self.current_time<self.next_try_at:
            reward += self.calculate_reward(
                action = action, 
                completed_task=False,
                failed_attempts_on_current_task=self.failed_attempts_on_current_task,
                current_time=self.current_time,
                lst_of_used_genai_on_metatasks=[self.used_genai_on_metatask_1,self.used_genai_on_metatask_2,self.used_genai_on_metatask_3],
                current_metatask=current_metatask)
            
            self.current_time += 5 #simulates that a step occurs every 5 seconds

        #simulate the student for one step
        else:
                
            #simulate one step --> if student can use genAI task difficulty is reduced
            if can_use_genAI:
                records = self.student_model.simulate_student(task_skill_map=[self.task_skill_map[self.current_task]], task_difficulties=[self.difficulties[self.current_task]*0.5], retake_until_correct=False, current_attempt=self.failed_attempts_on_current_task)
            else:
                records = self.student_model.simulate_student(task_skill_map=[self.task_skill_map[self.current_task]], task_difficulties=[self.difficulties[self.current_task]], retake_until_correct=False, current_attempt=self.failed_attempts_on_current_task)

            #if the student answered wrong
            if records[0]["correct"] == 0:

                reward += self.calculate_reward(action=action, 
                                                completed_task=False, 
                                                failed_attempts_on_current_task=self.failed_attempts_on_current_task,
                                                current_time=self.current_time,
                                                lst_of_used_genai_on_metatasks=[self.used_genai_on_metatask_1,self.used_genai_on_metatask_2,self.used_genai_on_metatask_3],
                                                current_metatask=current_metatask)

                #no need to update current task
                #no need to update used GenAI

                #update failed attempts on current task
                self.failed_attempts_on_current_task += 1

                #update failed attempts on metatask
                self.failed_attempts_on_metattasks[current_metatask] += 1

                #update when the next try is going to occur [TO-DO might have to be adjusted for differing time when allowed to use genAI
                if can_use_genAI:
                    self.next_try_at = self.current_time + self.skewed_scaled_beta(min=5,max=60) #assume answering again takes approx 15 s if access to GenAI
                else:
                    self.next_try_at = self.current_time + self.skewed_scaled_beta(min=5,max=30) #assume answering again takes approx 10 s if no access to GenAI
    
            #if the student answered correct
            else:

                reward += self.calculate_reward(action=action, 
                                                completed_task=True, 
                                                failed_attempts_on_current_task=self.failed_attempts_on_current_task,
                                                current_time=self.current_time,
                                                current_metatask=current_metatask,
                                                lst_of_used_genai_on_metatasks=[self.used_genai_on_metatask_1,self.used_genai_on_metatask_2,self.used_genai_on_metatask_3])

                #update current task
                self.current_task += 1

                #update failed attempts on current task 
                self.failed_attempts_on_current_task = 0

                #update next try
                if can_use_genAI:
                    self.next_try_at = self.current_time + float(min(max(np.random.normal(52.4, 36.0), 22.2), 161.6)) #assume that answering a new task takes longer
                else:
                    self.next_try_at = self.current_time + float(min(max(np.random.normal(57.0, 27.8), 22.2), 161.6))


                #if they went to a new metatask
                if self.current_task == 3 or self.current_task == 6 or self.current_task == 9:
                    
                    #reset current time
                    self.current_time = 0
                    self.next_try_at = float(min(max(np.random.normal(163.9, 126.2), 112.3), 417.2)) #again assume student needs time to read through task informed by first pilot

                    #break out of loop
                    if self.current_task == 3:
                        current_metatask = 1
                    elif self.current_task == 6:
                        current_metatask = 2
                    #if the episode is finished ie. current_task would go to 9
                    else:
                        terminated = True

                
            self.current_time += 5 #simulates that a step occurs every 5 seconds
                    

            #end simulating student for one step
            #if the agent chooses action 1 allow genAI usage
            if action == 1:

                #update used GenAI on metatask (use local/current metatask variable)
                if current_metatask == 0:
                    self.used_genai_on_metatask_1 = 1
                elif current_metatask == 1:
                    self.used_genai_on_metatask_2 = 1
                else:
                    self.used_genai_on_metatask_3 = 1

        #end of else for checking if action is
            

        if verbose:
            print("\n" + "="*70)
            print(f"STEP START — Current Task: {self.current_task} | Action taken: {action}")
            #needed since student does not answere every time
            try:
                print(f"Student answered {'correctly' if records[0]['correct']==1 else 'wrongly'}")
            except:
                print("Student did not answer in this iteration")
            print(f"Metatask: {current_metatask}")
            print(f"Time: {self.current_time} | Next try at: {self.next_try_at}")
            print(f"Failed attempts on current task: {self.failed_attempts_on_current_task}")
            print(f"Failed attempts per metatask: {self.failed_attempts_on_metattasks}")
            print(f"Used GenAI per metatask: {[self.used_genai_on_metatask_1,self.used_genai_on_metatask_2,self.used_genai_on_metatask_3]}")
            print("="*70)


        #update observation
        observation = np.array([
            self.failed_attempts_on_current_task,     # failed attempts on current task 
            self.current_time, # current time  
            self.failed_attempts_on_metattasks[current_metatask-1] if not current_metatask == 0 else 0, #failed attempts on last metatask        
            self.used_genai_on_metatask_1,
            self.used_genai_on_metatask_2,
            self.used_genai_on_metatask_3,
            self.current_metatask  #current metatask
        ], dtype=np.float32)       

        if verbose:
            print("\n" + "!"*70)
            print(f"Reward for this action: {reward}")
            print("!"*70)
            
        # Unneded values that stablebaseline requires
        info = {}  # Additional info (Not needed for this environment)
        
        return observation, reward, terminated, truncated, info
    


    
env = LearningEnv()
env.reset()
for i in range(100):
    env.step(0, verbose=True)
env.step(1, verbose=True)

