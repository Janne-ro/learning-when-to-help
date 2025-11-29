// controllers.js (or wherever you define controllers)
app.controller('DistractorCtrl', ['$scope', '$location', function($scope, $location) {
  // model bound to the input (kept minimal; title/instructions are static in the HTML)
  $scope.enteredPassword = '';

  $scope.title = "Password Gate"

  // derived state / feedback
  $scope.passwordCorrect = false;
  $scope.feedback = '';

  // destination route after successful password
  $scope.redirectPath = '/task2'; // change this to the correct next route if needed

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
      // clear sensitive value for safety
      $scope.enteredPassword = '';
      // navigate to next task
      $location.path($scope.redirectPath);
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
