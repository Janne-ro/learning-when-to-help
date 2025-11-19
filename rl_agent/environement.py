#file including the environment for the rl agent using stable baselines3

import gym
from gym import spaces
import numpy as np
#import bkt module
from bkt import BKTModel
from bkt import MultiSkillBKT

class CustomEnv(gym.Env):
    def __init__(self):

        #initlize super class
        super().__init__()

        # Define the observation space
        # 1) Failed attempts on current task (0-20)
        # 2) Time on the current task in seconds (0-10000)
        # 3) Whether the last task was correct (0 or 1) 
        # 4) Current understanding modeled as failed attempts on previous tasks (0-100)
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
        
    #resets the enviroment to an intial state with one inital student
    def reset(self, seed=None, options=None):
        
        #set seed if given
        if seed is not None:
            np.random.seed(seed)

        #generate a random student using beta distributions 
        random_p_init = np.random.beta(1, 7) #basically exponential decay
        random_p_trans = np.random.beta(1, 7) 
        random_slip = np.random.beta(2, 10) #skewed bell curve towards low slip
        random_guess = np.random.beta(2, 6)

        #initialize multi-skill BKT
        self.student_model = MultiSkillBKT(n_skills=2, p_init=random_p_init, p_trans=random_p_trans, slip=random_slip, guess=random_guess)

        #Only simulate for one step
        records = self.student_model.simulate_student(list(self.task_skill_map[0]), task_difficulties=list(self.difficulties[0]), seed=seed, retake_until_correct=False)

        #output results 
        print(f"task {records[0]['task']}, attempt {records[0]['attempt']}, skills {records[0]['skills']}, difficulty={records[0]['difficulty']}, correct={records[0]['correct']}")

        #check if current task was correct or needs to be repeated (Cant be higher than 9 here in intalization)
        current_task_correct = records[0]['correct']
        if current_task_correct:
            next_task = records[0]['task'] + 1
        else:
            next_task = records[0]['task']  #repeat same task if incorrect

        def skewed_scaled_beta(size=1, alpha = 2, beta = 4, min=60, max=240):
            y = np.random.beta(2, 4, size=size)  # skewed towards lower values with inital values
            return min + (max-min) * y 

        #Sample state 
        failed_attempts = records[0]['attempt'] - 1  #number of failed attempts before current
        time_on_task = skewed_scaled_beta() + failed_attempts * skewed_scaled_beta(min=15, max=80)  #assume each attempt takes between 15 and 80 seconds and intial time is between 60 and 240 seconds (with mean 120)
        last_task_correct = 0 #not yet answered
        current_understanding = 0 #failed attempts on previous tasks
            
        # Reset environment state
        observation = np.array([
            failed_attempts,      
            time_on_task,         
            last_task_correct,    
            current_understanding 
        ], dtype=np.float32)

        #return student parameters in info
        info = {
            'student_params': {
                'p_init': random_p_init,
                'p_trans': random_p_trans,
                'slip': random_slip,
                'guess': random_guess,
                'next_task': next_task,
            }
        }  #Additional info
        return observation, info
    
    def step(self, action):
        # Execute action and update environment state
        observation = self.observation_space.sample()  # Replace with next state
        reward = 0.0  # Calculate appropriate reward
        terminated = False  # Is episode done due to termination condition?
        truncated = False  # Is episode done due to time limit or other constraint?
        info = {}  # Additional info
        
        return observation, reward, terminated, truncated, info