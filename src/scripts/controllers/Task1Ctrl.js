
// Later, you can close it like this:
//newTab.close();

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

  // Array of chat messages (can be deleted by clear chat)
  // each message: { who: 'user'|'ai', text: '...' }
  $scope.messages = [];

  //Create variable for overall ai messages (including clear chat commands)
  var humanAIInteraction = [];

  // Backend URL
  var backendUrl = 'http://localhost:8080/api/ask-ai'; 

  // helper: scroll to bottom
  function scrollToBottom(delay) {
    // give DOM a tick to render
    $timeout(function() {
      var el = document.getElementById('llm-messages');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, delay || 50);
  }

  // Send message to LLM
  $scope.sendToLLM = function() {
    var text = ($scope.llm.prompt || '').trim();
    if (!text) {
      $scope.llm.error = 'Please type something to send.';
      return;
    }

    // push user message immediately
    $scope.messages.push({ who: 'user', text: text });
    humanAIInteraction.push({ who: 'user', text: text });

    // clear input and set loading
    $scope.llm.prompt = '';
    $scope.llm.loading = true;
    $scope.llm.error = '';
    scrollToBottom(0);

    // call backend
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
        // ensure scroll after AI reply appears
        scrollToBottom(120);
      });
  };

  // Enter to send, Shift+Enter newline
  $scope.handleKeydown = function(event) {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      $scope.sendToLLM();
    }
  };

  // clear input (button)
  $scope.clearLLM = function() {
    $scope.llm.prompt = '';
    $scope.llm.error = '';
  };

  // clear whole conversation
  $scope.clearConversation = function() {
    $scope.messages = [];
    $scope.llm.prompt = '';
    $scope.llm.error = '';
    humanAIInteraction.push({ who: 'system', text: '[Conversation cleared]' });
  };

  // focus input convenience
  $scope.focusInput = function() {
    $timeout(function() {
      var ta = document.querySelector('.chat-input textarea');
      if (ta) ta.focus();
    }, 10);
  };

  // initial scroll
  $timeout(scrollToBottom, 200);

  // Dummy task content
  $scope.questions = [
  "What is the main idea of the given paragraph?",
  "How would you apply this concept in a real-world scenario?",
  "Did you find this task easy or challenging? Why?"
];

$scope.correctAnswers = [
  "42",
  "42",
  "42"
];

//NOTE: NEED TO HAVE THE STUDENTS ANSWER FIRST QUESTION UNTIL CORRECT, THEN SECOND QUESTION ETC

$scope.messagesQuestionsIncorrect = [];

$scope.answers = [];

// Simple submission handler
$scope.submitTask = function() {
  if ($scope.answers.length < $scope.questions.length || $scope.answers.some(a => !a)) {
    $scope.msg = "Please answer all questions!";
    return;
  } 
  else if ($scope.answers.some((answer, index) => answer !== $scope.correctAnswers[index])) {
    // If one or multiple answers are incorrect
    $scope.messagesQuestionsIncorrect = $scope.answers.map((answer, index) => {
      return answer !== $scope.correctAnswers[index]
        ? "Your answer is incorrect. Please try again."
        : "";
    });
    $scope.msg = "One or more answers are incorrect. Please review and try again.";
    return;
  } 
  else {
    // All answers are correct
    User.setQueriesTask1(humanAIInteraction);

    console.log("Task 1 answers:", $scope.answers);
    console.log("LLM interactions for Task 1:", User.getQueriesTask1());

    User.setStartTimeTask2(new Date().getTime());

    // Continue to task 2
    $location.path("/task2");
  }
};

});
