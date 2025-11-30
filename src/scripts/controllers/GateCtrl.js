app.controller('GateCtrl', ['$scope', '$location', function($scope, $location) {
  // model bound to the input (kept minimal; title/instructions are static in the HTML)
  $scope.enteredPassword = '';

  $scope.title = "Password Gate"

  // derived state / feedback
  $scope.passwordCorrect = false;
  $scope.feedback = '';

  // call on input change (ng-change) to provide immediate feedback
  $scope.checkPassword = function() {
    var p = ($scope.enteredPassword || '').trim();
    if (!p) {
      $scope.passwordCorrect = false;
      $scope.feedback = '';
      return;
    }

    // Accept 'Banana' (case-insensitive)
    if (p.toLowerCase() === 'banana') {
      $scope.passwordCorrect = true;
      $scope.feedback = 'Password accepted. Click Continue to proceed.';
    } else {
      $scope.passwordCorrect = false;
      $scope.feedback = 'Incorrect password. Please wait for the experimenter to provide it to you.';
    }
  };

  // invoked by the Continue button (only enabled when passwordCorrect is true)
  $scope.tryContinue = function() {
    if ($scope.passwordCorrect) {
        //begin timer for task 4
        User.setStartTimeSelfTask(new Date().getTime());
        //navigate to next task
        $location.path('/task4');
    } else {
      $scope.feedback = 'Enter the correct password before continuing.';
    }
  };

  // optional: allow Enter key to trigger check & proceed
  $scope.onKeydown = function($event) {
    if ($event.key === 'Enter') {
      $event.preventDefault();
      $scope.checkPassword();
      if ($scope.passwordCorrect) {
        $scope.tryContinue();
      }
    }
  };
}]);
