# Code for the RL agent on PPO
# Make sure you have: pip install stable-baselines3[extra] gymnasium

from environment import LearningEnv     # your environment file
from gymnasium.envs.registration import register
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.monitor import Monitor
import gymnasium as gym

# ---------------------------------------------
# 1. Register the custom environment
# ---------------------------------------------
register(
    id="MyEnv-v0",
    entry_point="my_env_file:LearningEnv",
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
    tensorboard_log="./ppo_logs/",   # Optional
)

# ---------------------------------------------
# 4. Train the model
# ---------------------------------------------
TIMESTEPS = 100_000
model.learn(total_timesteps=TIMESTEPS)

# ---------------------------------------------
# 5. Save the trained model
# ---------------------------------------------
model.save("ppo_myenv")

# ---------------------------------------------
# 6. Load and run a demo episode
# ---------------------------------------------
model = PPO.load("ppo_myenv")

env = gym.make("MyEnv-v0")
obs, _ = env.reset()

for step in range(500):  # run one episode
    action, _ = model.predict(obs)
    obs, reward, terminated, truncated, info = env.step(action)

    if terminated or truncated:
        obs, _ = env.reset()

env.close()
