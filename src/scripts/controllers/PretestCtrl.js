app.controller('PretestCtrl', function($scope, $location, User) { 
    
    //initialize agreement variable 
    $scope.agreed = false; 

    //track which part of the pretest page we’re in (initialize both to false)
    $scope.start = false; 
    $scope.start2 = false; 
    
    //Questions for the pretest (identical to posttest)
    $scope.questions = [
        "How does the use of AI make you feel about your future Career prospects?",
        "How beneficial do you believe using AI is for the learning outcomes when studying?",
        "I am aware of how AI usage affects my own thinking processes",
        "I am conscious of how AI usage affects my memory and retention of information",
        "I am aware of when I use AI to avoid challenging cognitive tasks",
        "I am aware of how much I rely on AI while working on academic tasks",
        "I can recognize when AI usage enhances versus hinders my learning",
        "I decide how to approach a problem on my own before I ask an AI for a solution",
        "I focus on understanding the information an AI tool provides, not just on getting an answer",
        "I verify the accuracy of AI outputs before using them",
        "If an AI tool gives me incorrect or unclear information, I try to solve the task on my own",
        "After completing a task with AI, I evaluate what I have learned versus what the AI did for me",
        "After completing a task with AI, I ask myself If I could have accomplished the task more effectively without using an AI tool"
    ];
    $scope.answers = [];

    
    $scope.continueToPretest = function() { 
        //Save time when starting pretest
        const time = new Date().getTime(); 
        User.setStartTimePretest(time); 
        console.log('Pretest start time set:', time);
        
        //save demographic data 
        User.setGender($scope.gender); 
        User.setAge($scope.age); 
        User.setEducation($scope.education); 
        console.log(User.getResponse()); //check what’s stored 
    }; 
    
    //function to process the answers and move to first task    
    $scope.processAnswers = function() {
        //check that all questions are answered
        if ($scope.answers.filter(a => a !== undefined && a !== null && a !== "").length !== $scope.questions.length) {
            $scope.msg = "Please answer all questions!";
            return;
        }

        var ans = $scope.answers;
        console.log(ans);
        
        //assign test type (1 = never allow, 2 = always allow, 3 = RL agent decides)
        var random = (Math.floor((Math.random() * 10000)) % 3) + 1;

        //for testing set random to 1
        random = 1;

        if (random == 1){
            User.setTestType("never");
        } else if (random == 2){
            User.setTestType("always");
        } else {
            User.setTestType("RL");
        }
        User.setPre(ans);

        //set time for starting first task
        const time = new Date().getTime(); 
        User.setStartTimeTask1_1(time); 
        console.log('Task 1 start time set:', time);

        console.log(User.getResponse());

        //Redirect to first task
        $location.path("/task1");

    };
});