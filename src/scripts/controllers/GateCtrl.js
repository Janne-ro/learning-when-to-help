app.controller('GateCtrl', function($scope, $location, User) {
    //create variable for the entered password
    $scope.enteredPassword = '';

    //defiene title
    $scope.title = "Password Gate"

    //define derived state and feedback
    $scope.passwordCorrect = false;
    $scope.feedback = '';

    //call input change (ng-change) to provide immediate feedback
    $scope.checkPassword = function() {
        
        //remove whitespaces
        var p = ($scope.enteredPassword || '').trim();
        
        //check that password is not empty
        if (!p) {
            $scope.passwordCorrect = false;
            $scope.feedback = '';
            return;
        }

        //Accept 'Banana' (case insensitive) as the correct password --> also adapt message accordingly
        if (p.toLowerCase() === 'banana') {
            $scope.passwordCorrect = true;
            $scope.feedback = 'Password accepted. Click Continue to proceed.';
        } else {
            $scope.passwordCorrect = false;
            $scope.feedback = 'Incorrect password. Please wait for the experimenter to provide it to you.';
        }
    };

    //invoked by the continue button (which is only enabled when passwordCorrect is true)
    $scope.tryContinue = function() {
        //only proceed if the password is correct
        if ($scope.passwordCorrect) {
            //begin timer for task 4
            User.setStartTimeSelfTask(new Date().getTime());
            //navigate to next task
            $location.path('/task4');
        } else {
            $scope.feedback = 'Enter the correct password before continuing.';
        }
    };

    //also allow Enter key to trigger check & proceed
    $scope.onKeydown = function($event) {
        if ($event.key === 'Enter') {
            $event.preventDefault();
            $scope.checkPassword();
            if ($scope.passwordCorrect) {
                $scope.tryContinue();
            }
        }
    };
});
