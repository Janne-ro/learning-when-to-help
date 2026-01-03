# Metacognitive Scaffolding and Reinforcement Learning

This repository contains the code for my master thesis titled "Learning When to Help: A Reinforcement Learning Framework for Metacognitive AI Support in Education". The project explores wheter a pedagogically steered policy can be learned via reinforcement learning to help students develop self-regulated learning skills, by timing the access to generative AI.

## Overview

This project implements a web-based educational platform that uses a reinforcement learning agent to determine optimal timing for providing support to learners.

The project consists of two main components:
- A web application frontend and backend for user interaction and data collection used in the main experiment
- A reinforcement learning pipeline for training and evaluating AI agents

## Prerequisites

To run this project correctly, ensure you have the following:

- **Node.js** (version 14 or higher)
- **Python** (version 3.8 or higher) for the RL components
- **.env file**: Required for API calls. This file should contain necessary environment variables for external API integrations.
- **package-lock.json**: Required for the Google Drive API integration to ensure consistent dependency versions for secure data saving.

## APIs Used

The project utilizes the following APIs:

- **OpenRouter API**: Used as an AI proxy service to access various language models for interacting with the User.
- **Google Drive API**: Employed for securely storing response data on a university-owned Google Drive account to prevent data loss and ensure data safety.
- **Mistral AI**: Integrated through OpenRouter for AI model inference, chosen specifically because Mistral AI is based in Europe, ensuring compliance with European data protection regulations (GDPR) and reducing latency for European users. This choice prioritizes data sovereignty and compliance with EU regulations.


## Data Storage

The system implements a dual-storage approach to mitgate data loss:

- **Local CSV Storage**: All user responses are saved locally in `responses.csv` for immediate access and analysis.
- **Secure Cloud Storage**: Data is also automatically uploaded to a university-owned Google Drive account using the Google Drive API. This provides redundancy and ensures data persistence even in case of local system failures.

## Model Training Pipeline

The reinforcement learning pipeline follows a comprehensive approach from knowledge modeling to deployment:

### 1. Bayesian Knowledge Tracing (BKT) with Extensions
- **Foundation**: Starts with BKT, a probabilistic model for tracking student knowledge states over time.
- **Extensions**: Uses KT-IDEM and multiple retake extansions as fitting for the given task

### 2. Custom Environment Development
- **Environment Design**: A custom Gym-compatible environment (`rl_agent/environment.py`) that simulates student learning interactions, incorporating:
  - Student knowledge states
  - Scaffolding interventions
  - Pedagogically informed reward structures based on learning outcomes
- **State Space**: Includes student performance metrics, intervention history, and contextual factors.
- **Reward function**: Pedagogically grounded reward signal to the reinforcement learning agent. Speficially relys on:
    - Metacognitive theory
    - Cognitive Load Theory and Cognitive Offloading
    - Productive Failure framework
- **Action Space**: Wheter the agent allows generative AI use or not for the current task. An action will be selected every 5 seconds. 

### 3. Model Comparison
- **Algorithms Evaluated**: Comparison of multiple RL algorithms including:
  - Proximal Policy Optimization (PPO)
  - Deep Q-Network (DQN)
  - Advantage Actor-Critic (A2C)
- **Evaluation Metrics**: Performance assessed on average cumulative reward.

### 4. Model Fine-tuning
- **Hyperparameter Optimization**: Systematic tuning of hyperparameters using Optunas Tree-structured Parzen Estimator (TPE). This approach is particularly well suited to RL, as it does not rely on random sampling but instead constructs a Bayesian probability model that captures which hyperparameter configurations are associated with high rewards, thereby allowing it to model complex parameter dependencies.
- **Domain Adaptation**: Fine-tuning models on domain-specific data to improve performance in educational contexts.

### 5. Experimentation and Reward Parameter Tuning
- **Reward Function Design**: Iterative refinement of reward structures to lead to desired agent behaviour.
- **Validation**: Cross-validation with simulated datasets and pilot study.

## Project Structure

### Web Application (`src/`)

The web application is built with Node.js and follows a modular MVC-like structure:

```
src/
├── assets/                 # Static assets (images, fonts, etc.)
├── scripts/
│   ├── app.js              # Main application entry point
│   ├── server.js           # Express server configuration
│   ├── services.js         # Business logic and API integrations
│   └── controllers/        # Route handlers for different pages
│       ├── GateCtrl.js     # Landing/gate page controller
│       ├── PretestCtrl.js  # Pre-test assessment controller
│       ├── Task1Ctrl.js    # Learning task 1 controller
│       ├── Task2Ctrl.js    # Learning task 2 controller
│       ├── Task3Ctrl.js    # Learning task 3 controller
│       ├── Task4Ctrl.js    # Learning task 4 controller
│       └── PosttestCtrl.js # Post-test assessment controller
├── styles/
│   └── styles.css         # Application stylesheets
├── templates/             # HTML templates for forms
│   ├── consent.html       # User consent form
│   └── demographics.html  # Demographic information collection
└── views/                 # Main page views
    ├── gate.html          # Landing page
    ├── pretest.html       # Pre-test interface
    ├── task1.html         # Task 1 interface
    ├── task2.html         # Task 2 interface
    ├── task3.html         # Task 3 interface
    ├── task4.html         # Task 4 interface
    └── posttest.html      # Post-test interface
```

### Reinforcement Learning (`rl_agent/`)

The RL component contains the training and evaluation pipeline:

```
rl_agent/
├── bkt.py                     # Bayesian Knowledge Tracing implementation
├── environment.py             # Custom RL environment
├── compare_models.ipynb       # Model comparison notebook
├── parameter estimation.ipynb # Parameter estimation analysis
├── rl_agent_training.ipynb    # Main training notebook
├── ppo_policy.onnx            # Trained PPO model (ONNX format)
├── models/                    # Saved model checkpoints
├── ppo_logs/                  # TensorBoard logs for different runs
│   ├── A2C_*/                 # A2C algorithm training logs
│   ├── DQN_*/                 # DQN algorithm training logs
│   └── PPO_*/                 # PPO algorithm training logs
├── visualizations/            # Analysis and visualization notebooks
└── images/                    # Generated plots and figures
```

## Concurrently Used Ports

- **Frontend**: Port 3000 - Main web application interface
- **AI Proxy (OpenRouter)**: Port 8080 - Handles AI model API calls
- **Save Response Server**: Port 4000 - Dedicated server for data persistence

## How to Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   - Create a `.env` file with required API keys and configuration
   - Ensure `package-lock.json` is present for Google Drive API dependencies

3. **Start the Application**:
   ```bash
   npm start
   ```

The application will start all three servers concurrently, making the frontend available at `http://localhost:3000`.

## Development Status

This project is currently in active development as part of a master thesis. Features may be added or modified as research progresses.

## License

This project is licensed under the terms of the [MIT License](license.md)