
// Later, you can close it like this:
//newTab.close();

//Controller for Task 1
app.controller('Task1Ctrl', function($scope, User, $location, $http) {

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
    //Open AI tab (example dummy site)
    //window.open("https://chat.openai.com/?model=gpt-5", "_blank");
  } else {
    $scope.aiMessage = "AI usage status is undefined."; //Should never happen
    $scope.allowAI = true; //--> should usually be set to false or even better deleted (for testing always true)
  }

  // LLM UI state
  $scope.llm = {
    prompt: '',
    response: '',
    loading: false,
    error: ''
  };

  $scope.sendToLLM = function() {
    const text = ($scope.llm.prompt || '').trim();
    if (!text) {
      $scope.llm.error = 'Please write a question or prompt.';
      return;
    }
    $scope.llm.loading = true;
    $scope.llm.error = '';
    $scope.llm.response = '';

    // inside Task1Ctrl
    const backendUrl = 'http://localhost:8080/api/ask-ai'; // /change if backend uses different port
    $http.post(backendUrl, { prompt: text })
    .then(function(res) {
        $scope.llm.response = res.data.reply || '(no reply)';
        $scope.llm.loading = false;
    })
    .catch(function(err) {
        console.error('LLM call error:', err);
        $scope.llm.error = `Request failed: ${err.status} ${err.statusText} — ${JSON.stringify(err.data)}`;
        $scope.llm.loading = false;
    });

  };

  // optionally a convenience to clear
  $scope.clearLLM = function() {
    $scope.llm.prompt = '';
    $scope.llm.response = '';
    $scope.llm.error = '';
  };

  // Dummy task content
  $scope.questions = [
    "What is the main idea of the given paragraph?",
    "How would you apply this concept in a real-world scenario?",
    "Did you find this task easy or challenging? Why?"
  ];

  $scope.answers = [];

  // Simple submission handler
  $scope.submitTask = function() {
    if ($scope.answers.length < $scope.questions.length || $scope.answers.some(a => !a)) {
        $scope.msg = "Please answer all questions!"
        return;
    }

    //Save user answers
    

    // Continue to task 2
    $location.path("/task2");
  };
});
