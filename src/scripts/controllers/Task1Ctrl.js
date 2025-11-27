
//Controller for Task 1
app.controller('Task1Ctrl', function($scope, User, $location, $http, $timeout) {

  //Get test type (already implemented elsewhere)
  const testType = User.getTestType();

  //Set allow ai flag based on test type
  $scope.allowAI = false; 

  //Display different messages based on test type
  if (testType === "never") {
    $scope.aiMessage = "You are not allowed to use generative AI for this task";
    $scope.allowAI = true; //--> should usually be set to false (for testing always true)
  } else if (testType === "RL") {
    $scope.aiMessage = "You are currently not allowed to use generative AI for this task. In the future this might change";
    $scope.allowAI = true; //--> should usually be set to false (for testing always true)
  } else if (testType === "always") {
    $scope.aiMessage = "You are allowed to use generative AI for this task";
    $scope.allowAI = true;
  } else {
    $scope.aiMessage = "AI usage status is undefined."; //Should never happen
    $scope.allowAI = true; //--> should usually be set to false or even better deleted (for testing always true)
  }

  // LLM/chat state
  $scope.llm = {
    prompt: '',
    loading: false,
    error: ''
  };

  //Array of chat messages (can be deleted by clear chat)
  //each message has: { who: 'user'|'ai', text: '...' }
  $scope.messages = [];

  //Create variable for overall ai messages (including clear chat commands); different from scope.messages only in that sense
  var humanAIInteraction = [];

  //Backend URL on which the llm api is hosted
  var backendUrl = 'http://localhost:8080/api/ask-ai'; 

  //helper function that scrolls to the bottom
  function scrollToBottom(delay) {
    //give DOM a tick to render
    $timeout(function() {
      var el = document.getElementById('llm-messages');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, delay || 50);
  }

  //send message from user to LLM
  $scope.sendToLLM = function() {
    var text = ($scope.llm.prompt || '').trim();
    if (!text) {
      $scope.llm.error = 'Please type something to send.';
      return;
    }

    //push user message immediately to the messages 
    $scope.messages.push({ who: 'user', text: text });
    humanAIInteraction.push({ who: 'user', text: text });

    //clear input and set loading
    $scope.llm.prompt = '';
    $scope.llm.loading = true;
    $scope.llm.error = '';
    scrollToBottom(0);

    //call backend
    $http.post(backendUrl, { prompt: text })
      .then(function(res) {
        var reply = (res.data && res.data.reply) ? res.data.reply : '(no reply)';
        $scope.messages.push({ who: 'ai', text: reply });
        humanAIInteraction.push({ who: 'ai', text: reply });
      })
      .catch(function(err) {
        console.error('LLM call failed:', err);
        var errMsg = (err && err.data && err.data.error) ? err.data.error : 'AI service error';
        $scope.messages.push({ who: 'ai', text: 'Error: ' + errMsg });
        humanAIInteraction.push({ who: 'ai', text: 'Error: ' + errMsg });
      })
      .finally(function() {
        $scope.llm.loading = false;
        //ensure scroll after AI reply appears
        scrollToBottom(120);
      });
  };

  //enter to send, Shift+Enter newline
  $scope.handleKeydown = function(event) {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      $scope.sendToLLM();
    }
  };

  //clear input (button)
  $scope.clearLLM = function() {
    $scope.llm.prompt = '';
    $scope.llm.error = '';
  };

  //clear the whole conversation
  $scope.clearConversation = function() {
    $scope.messages = [];
    $scope.llm.prompt = '';
    $scope.llm.error = '';
    humanAIInteraction.push({ who: 'system', text: '[Conversation cleared]' });
  };

  //focus input convenience
  $scope.focusInput = function() {
    $timeout(function() {
      var ta = document.querySelector('.chat-input textarea');
      if (ta) ta.focus();
    }, 10);
  };

  //initial scroll
  $timeout(scrollToBottom, 200);

  //Part on the questions the user has to answer
  //each question has a prompt, 5 options and an array of correct option indices
  $scope.questions = [
    {
      prompt: "According to the text, which statements are true about “middle-rug” contacts?",
      options: [
        "Middle-rung contacts describes average people, persons that are neither especially good looking and successful nor the opposite.",
        "There are people for whom it would be impossible to define who middle-rung contacts are.",
        "Middle-rung contacts describe people who are neither famous nor close friends but somewhere in the middle.",
        "An example of a middle-rung contact would be a friend of a friend who is especially successful.",
        "An example of a middle-rung contact would a classmate with whom you rarely interact of that you know their grades are worse than yours."
      ],
      //correct answers
      correctIndices: [2, 3, 4]
    },
    {
      prompt: "According to the text, what statements are true about social media usage and comparisons?",
      options: [
        "Research indicated that girls tend to compare themselves more to their peers than boys.",
        "While generally girls compare themselves more regarding their thinness, boys tend to wish to be more muscular.",
        "Over 1/3 of young people in spain use social media for more than four hourse each day.",
        "45% of teenagers and young adults report they are “almost constantly” online.",
        "Research indicates that the younger you are the more likely you are to compare yourselves to others."
      ],
      //correct answers
      correctIndices: [1, 3]
    },
    {
      prompt: "According to the definition in the text, which statements are true about self-image?",
      options: [
        "Self-image describes amongst others how you think you are perceived by others.",
        "Self-image includes how you see yourself and how you think about it.",
        "Self-image is an objective state and does not depend on emotions.",
        "We only refer to something as social comparison if we compare our looks, not for instance successfulness.",
        "Social media changes the dynamic of how we view our self-image."
      ],
      //correct answers
      correctIndices: [0, 1, 4]
    }
  ];

  //track which question is currently active (only this can be interacted with)
  $scope.currentQuestionIndex = 0;

  //define currently selected options flags
  $scope.selectedOptions = [];
  $scope.questions.forEach(function(q, i) {
    $scope.selectedOptions[i] = new Array(q.options.length).fill(false);
  });

  //track which questions have been answered correctly
  $scope.answeredCorrect = new Array($scope.questions.length).fill(false);

  //messages that will be displayed for incorrect attempts
  $scope.messagesQuestionsIncorrect = new Array($scope.questions.length).fill('');

  //helper function to check whether selected options are equal the correct set (set equality)
  $scope.isAnswerCorrect = function(qIndex) {
    var selected = [];
    $scope.selectedOptions[qIndex].forEach(function(val, idx) {
      if (val) selected.push(idx);
    });
    //sort both arrays for reliable comparison
    selected.sort(function(a,b){return a-b;});
    var correct = ($scope.questions[qIndex].correctIndices || []).slice().sort(function(a,b){return a-b;});
    if (selected.length !== correct.length) return false;
    for (var i=0; i<selected.length; i++) {
      if (selected[i] !== correct[i]) return false;
    }
    return true;
  };

  //function thas called when user presses "Check answer" for current question
  $scope.checkAnswer = function(qIndex) {
    //prevent checking if not active question
    if (qIndex !== $scope.currentQuestionIndex) return;

    if ($scope.isAnswerCorrect(qIndex)) {
      $scope.answeredCorrect[qIndex] = true;
      $scope.messagesQuestionsIncorrect[qIndex] = '';
      //unlock next question if any
      if ($scope.currentQuestionIndex < $scope.questions.length - 1) {
        $scope.currentQuestionIndex++;
      }
    } else {
      $scope.answeredCorrect[qIndex] = false;
      $scope.messagesQuestionsIncorrect[qIndex] = "Your selection is incorrect. Make sure you select all and only the correct choices. If you have access you can use the generative AI!";
    }
  };

  //toggle option helper (only allowed for the active question and if not already marked correct)
  $scope.toggleOption = function(qIndex, optIndex) {
    if (qIndex !== $scope.currentQuestionIndex) return;
    if ($scope.answeredCorrect[qIndex]) return;
    $scope.selectedOptions[qIndex][optIndex] = !$scope.selectedOptions[qIndex][optIndex];
  };

  //function updated submitTask that only allows progression if all questions were answered correctly (in order)
  $scope.submitTask = function() {
    //check that all questions are answered correctly
    var allCorrect = $scope.answeredCorrect.every(function(x) { return x === true; });

    if (!allCorrect) {
      $scope.msg = "Please answer each question correctly before proceeding. Questions unlock sequentially.";
      //also show per-question feedback if available (messagesQuestionsIncorrect already contains them)
      return;
    }

    //If all answers are correct -> continue to next task
    User.setQueriesTask1(humanAIInteraction);

    console.log("Task 1 selected answers:", $scope.selectedOptions);
    console.log("LLM interactions for Task 1:", User.getQueriesTask1());

    User.setStartTimeTask2(new Date().getTime());

    //Continue to task 2
    $location.path("/task2");
  };
});
