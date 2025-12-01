# Code for the RL agent on PPO
# Make sure you have: pip install stable-baselines3[extra] gymnasium

from environment import LearningEnv     # your environment file
from gymnasium.envs.registration import register
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.monitor import Monitor
import gymnasium as gym
import numpy as np

# ---------------------------------------------
# 1. Register the custom environment
# ---------------------------------------------
register(
    id="MyEnv-v0",
    entry_point="environment:LearningEnv",
)

# ---------------------------------------------
# 2. Create and check the environment
# ---------------------------------------------
env = gym.make("MyEnv-v0")
check_env(env)        # Optional but recommended
env = Monitor(env)    # Logs rewards, episode lengths, etc.

# ---------------------------------------------
# 3. Create PPO model
# ---------------------------------------------
model = PPO(
    policy="MlpPolicy",
    env=env,
    verbose=1,
    tensorboard_log="./ppo_logs/",   # tensorboard --logdir ppo_logs
)


# ---------------------------------------------
# 4. Train the model
# ---------------------------------------------
TIMESTEPS = 100_000
model.learn(total_timesteps=TIMESTEPS)

# ---------------------------------------------
# 5. Save the trained model
# ---------------------------------------------
#model.save("ppo_myenv")

# ---------------------------------------------
# 6. Load and run a demo episode
# ---------------------------------------------
#model = PPO.load("ppo_myenv")


env = gym.make("MyEnv-v0")

num_episodes = 1000
action_means = []

for ep in range(num_episodes):
    print(f"Starting episode {ep+1}/{num_episodes}")
    obs, _ = env.reset()
    actions = []
    terminated = False

    while not terminated:
        action, _ = model.predict(obs, deterministic=True)
        actions.append(action)
        obs, reward, terminated, truncated, info = env.step(action)

    action_means

env.close()
