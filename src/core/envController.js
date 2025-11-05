import { assignCondition } from './conditionManager.js';
import { loadTask1 } from '../tasks/task1/task1.js';
import { log } from './dataLogger.js';

document.addEventListener('DOMContentLoaded', () => {
    //Load and log the condition
    const condition = assignCondition(); 
    console.log('Condition:', condition);
    log('conditionAssigned', { condition });

    //Load the first task (will automatically proceed to task 2 after submission)
    loadTask1(condition);
});
