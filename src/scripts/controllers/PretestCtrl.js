app.controller('PretestCtrl', function($scope, $location, User) { 
    
    // Initialize agreement variable 
    $scope.agreed = false; 

    // Track which part of the pretest page we’re in (initialize both to false)
    $scope.start = false; 
    $scope.start2 = false; 
    
    $scope.questions = ["I feel calm", "I feel secure", "I am tense", "I feel strained", "I feel at ease", "I feel upset", "I am pressently worrying over possible misfortunes", "I feel satisfied", "I feel frightened", "I feel comfortable", "I feel self-confident", "I feel nervous", "I am jittery", "I feel indecisive", "I am relaxed", "I am content", "I am worried", "I feel confused", "I feel steady", "I feel good"];
    $scope.answers = [];

    //Handle timing or transitions 
    $scope.setTime = function() { 
        const time = new Date().getTime(); 
        User.setStartTime(time); 
        console.log('Start time set:', time); 
    }; 
    
    $scope.continueToPretest = function() { 
        //Save demographic data 
        User.setGender($scope.gender); 
        User.setAge($scope.age); 
        User.setEducation($scope.education); 
        console.log(User.getResponse()); // Check what’s stored 
    }; 
    
    
    $scope.proceed = function(){ 
        if ($scope.agreed){
            $location.path('/task1'); 
        } else { 
            alert("Please fill out the demographics informations and the pretest to proceed."); 
        } 
    }; 

    $scope.processAnswers = function() {
         if ($scope.answers.length < $scope.questions.length || $scope.answers.some(a => a === undefined || a === null)) {
            $scope.msg = "Please answer all questions!"
            return;
        } else {
            var ans = $scope.answers;
            console.log(ans);
            
            //Set test type (1 = never allow, 2 = always allow, 3 = RL agent decides)
            var random = (Math.floor((Math.random() * 10000)) % 3) + 1;

            if (random == 1){
                User.setTestType("never");
            } else if (random == 2){
                User.setTestType("always");
            } else {
                User.setTestType("RL");
            }
            User.setPre(ans);
            console.log(random)

            console.log(User.getResponse());
            // User.save();
            $location.path("/home");
        };

    };
});