#file including the environment for the rl agent using stable baselines3

import gym
from gym import spaces
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
        # 3) Whether they used GenAI on last metatask
        # 4) Current understanding modeled as failed attempts on previous metatask (0-100)
        spaces.Box(
            low=np.array([0, 0, 0, 0], dtype=np.float32),
            high=np.array([20, 10000, 1, 20], dtype=np.float32),
            dtype=np.float32
        )
        
        # Define the action space
        self.action_space = spaces.MultiBinary(1)  #two discrete actions (0=don't allow, 1=allow)

        #Define current student model
        self.student_model = None

        #Define task skill mapping and difficulties
        self.task_skill_map = [[0], [1], [0,1], [0], [1], [0,1], [0], [1], [0,1]]
        self.difficulties = [0.6, 1, 1, 1, 1, 1, 1, 1, 2]

        #save some things about current state
        self.current_task = 0
        self.failed_attempts_on_current_task = 0
        self.current_time = 0
        self.next_try_at = 0

        #save how many failed attempts were on each metatask
        self.failed_attempts_on_metattasks = {"Task 1" : 0, "Task 2" : 0, "Task 3" : 0}

        #save if they used GenAI on each metatask
        self.used_genai_on_metatasks = {"Task 1" : False, "Task 2" : False, "Task 3" : False}


    def skewed_scaled_beta(self, size=1, alpha = 2, beta = 4, min=60, max=240):
            y = np.random.beta(2, 4, size=size)  # skewed towards lower values with inital values
            return min + (max-min) * y 
    
    #resets the enviroment to an intial state with one inital student
    def reset(self, seed=None, options=None):
        
        #set seed if given
        if seed is not None:
            np.random.seed(seed)

        #reset informations about current standing 
        self.failed_attempts_on_metattasks = {"Task 1" : 0, "Task 2" : 0, "Task 3" : 0}
        self.used_genai_on_metatasks = {"Task 1" : 0, "Task 2" : 0, "Task 3" : 0}
        self.current_task = 0
        self.failed_attempts_on_current_task = 0
        self.current_time = self.skewed_scaled_beta(60,240) #initalize to an inital value before the first question will be answered (min=60, max=240)
        self.next_try_at = 0 #holds at what time the next try will occur

        #generate a random student using beta distributions 
        random_p_init = np.random.beta(1, 7) #basically exponential decay
        random_p_trans = np.random.beta(1, 7) 
        random_slip = np.random.beta(2, 10) #skewed bell curve towards low slip
        random_guess = np.random.beta(2, 6)

        #initialize multi-skill BKT
        self.student_model = MultiSkillBKT(n_skills=2, p_init=random_p_init, p_trans=random_p_trans, slip=random_slip, guess=random_guess)
            
        # Reset environment state
        observation = np.array([
            self.failed_attempts_on_current_task,     # failed attempts on current task 
            self.current_time, # current time          
            0, #used GenAI on last metatask
            0  #failed attempts on last metatask
        ], dtype=np.float32)

        #return student parameters in info
        info = {
            'student_params': {
                'p_init': random_p_init,
                'p_trans': random_p_trans,
                'slip': random_slip,
                'guess': random_guess,
            }
        }  #Additional info
        return observation, info
    
    #function modeling the pedagogically grounded reward function (for details please refer to the paper)
    #basically feeds in the action and the current state 
    def calculate_reward(self, action, failed_attempts_on_current_task, current_time, used_genai_last_metatask, failed_attempts_last_metatask):
        pass
    
    def step(self, action):

        #initalize reward
        reward = 0.0

        #identify which metatask we are in
        if 0<=self.current_task<=2:
            current_metatask = "Task 1"
            last_metatask = None
        elif 3<=self.current_task<=5:
            current_metatask = "Task 2"
            last_metatask = "Task 1"
        else:
            current_metatask = "Task 3"
            last_metatask = "Task 2"

        start_loop = True

        while can_use_genAI==1 or start_loop:

            #check if there even is a try occuring
            if self.current_time<self.next_try_at:
                reward = 0.0
                break

            #reset start_loop which is only used to at least run the loop once
            start_loop = False

            #get wheter the student can currently use genai on the metatask
            can_use_genAI = self.used_genai_on_metatasks[current_metatask]

            #if action = 0 (dont allow GenAI) simulate one step 
            if action == 0 or can_use_genAI:

                #simulate one step
                records = self.student_model.simulate_student(list(self.task_skill_map[self.current_task]), task_difficulties=list(self.difficulties[self.current_task]), retake_until_correct=False)

                #if the student answered wrong
                if records[0]["correct"] == 0:

                    #no need to update current task
                    #no need to update used GenAI

                    #update failed attempts on current task
                    self.failed_attempts_on_current_task += 1

                    #update failed attempts on metatask
                    self.failed_attempts_on_metattasks[current_metatask] += 1

                    #update when the next try is going to occur
                    self.next_try_at += self.current_time + self.skewed_scaled_beta(10,60) #assume answering again takes between 10 and 60 seconds

                #if the student answered correct
                else:

                    #update current task
                    self.current_task += 1

                    #update failed attempts on current task 
                    self.failed_attempts_on_current_task = 0

                    #update time needed on task
                    self.next_try_at += self.current_time + self.skewed_scaled_beta(20,80) #assume that answering a new task takes longer

                    #if they went to a new metatask
                    if self.current_task == 3 or self.current_task == 6 or self.current_task == 9:
                        
                        #reset current time
                        self.current_time = 0
                        self.next_try_at = self.skewed_scaled_beta(60,240) #again assume that the students need between 60 and 240 seconds

                        #break out of loop
                        if self.current_task == 3:
                            current_metatask = "Task 2"
                            break
                        elif self.current_task == 6:
                            current_metatask = "Task 3"
                            break
                        #if the episode is finished ie. current_task would go to 9
                        else:
                            terminated = True
                            break

            #if the agent chooses action 1 (to allow GenAI usage)
            if action == 1:

                #update used GenAI on metatask
                self.used_genai_on_metatasks[current_metatask] = 1

            #get wheter the student can currently use genai on the metatask
            can_use_genAI = self.used_genai_on_metatasks[current_metatask]

            #update the current time
            self.current_time += 5 #simulates that a step occurs every 5 seconds
        

        #update observation
        observation = np.array([
            self.failed_attempts_on_current_task,     # failed attempts on current task 
            self.current_time, # current time          
            self.used_genai_on_metatasks[last_metatask] if last_metatask is not None else 0, #used GenAI on last metatask
            self.failed_attempts_on_metattasks[last_metatask] if last_metatask is not None else 0  #failed attempts on last metatask
        ], dtype=np.float32)        
            
        
        # Unneded values that stablebaseline requires
        truncated = False  # Is episode done due to time limit or other constraint? (Not needed for this environment)
        info = {}  # Additional info (Not needed for this environment)
        
        return observation, reward, terminated, truncated, info