app.controller('PretestCtrl', function($scope, $location, User) { 
    
    //initialize agreement variable 
    $scope.agreed = false; 

    //track which part of the pretest page we’re in (initialize both to false)
    $scope.start = false; 
    $scope.start2 = false; 
    
    //Questions for the pretest (identical to posttest)
    $scope.questions = [
        "I am confident in my ability to use AI tools effectively for my studies and/or work.",
        "I know which knowledge I need to deeply understand by myself versus what I can retrieve from AI when needed.",
        "I understand what I'm expected to genuinely learn versus what I'm expected to produce with AI assistance.",
        "I recognize that how much I learn depends on how I engage with AI, not just whether I use it.",
        "I am a good judge of whether I truly understand something or whether AI has done the thinking for me.",
        "I am aware of which learning strategies work best with AI and which work best without it.",
        "I have developed good habits for using AI in ways that support my learning.",
        "I can motivate myself to work through challenging material before turning to AI.",
        "I can recognize when using AI would help my learning versus when it would hinder it.",
        "Before starting a task with AI, I think about what I personally need to learn from it.",
        "I set learning goals for myself, not just task completion goals, when working with AI.",
        "I rephrase AI-generated explanations in my own words to make sure I understand them.",
        "I engage with the reasoning and structure behind AI-provided answers, not just the final answer.",
        "I consider how AI-provided information connects to what I already know.",
        "While using AI, I pause to check whether I'm genuinely understanding the material.",
        "After completing a task with AI, I reflect on what I actually learned myself.",
        "After finishing a task with AI, I ask myself whether I learned as much as I could have.",
        "When AI explanations don't help me understand, I try alternative prompts or approaches like working through it myself.",
        "When I'm confused while using AI, I reconsider my own understanding rather than just reprompting.",
        "When something AI provides is unclear, I work through it myself rather than just asking AI to explain again."
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
        
        //assign test type (1-3 = never allow, 4-6 = always allow, 7-10 = RL agent decides)
        //make it a little more likely to get the RL test type (40% as opposed to 30% for other two conditions)
        var random = (Math.floor((Math.random() * 10000)) % 10) + 1;

        //for testing set random to 9 (always RL)
        random = 9;

        if (random < 4){
            User.setTestType("never");
        } else if (random < 7){
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