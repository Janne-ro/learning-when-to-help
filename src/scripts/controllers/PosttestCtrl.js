app.controller('PosttestCtrl', function($scope, $location, User, $timeout) { 

    var testType = User.getTestType()
    //set the reflection message
    if (testType === "never") {
        $scope.reflectionMessage = "Do you have any further reflections on your work with the system? Would you have liked to have assitance in the form of generative AI? Would you have used it if was availbale?";
    } else if (testType === "RL") {
        $scope.reflectionMessage = "Do you have any further reflections on your work with the system? Do you think it was helpfull for your learning to have the AI assitance only sometimes?";
    } else if (testType === "always") {
        $scope.reflectionMessage = "Do you have any further reflections on your work with the system? Do you think using generative AI helped or hindered your learning?";
    } else {
        $scope.reflectionMessage = "Do you have any further reflections on your work with the system?"; //Should never happen
    }

    //track which section is currently visible
    $scope.selfAssessment = true;  
    $scope.start = true;          

    //self-assessment data
    $scope.selfAssessmentScore = null;
    $scope.selfAssessmentReflection = "";
    
    //Posttest questions (identical to pretest)
    $scope.questions = [
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

    //scroll to the top after loading page
    $timeout(function () {
        window.scrollTo(0, 0);
    }, 0);

    //go from self-assessment to post-questionnaire if everything is filled out
    /*$scope.goToPosttest = function() {
        if ($scope.selfAssessmentScore === null) {
            $scope.msg = "Please rate how well you think you did.";
            return;
        }
        $scope.msg = "";

        //save the reflection data
        User.setSelfEvalScore($scope.selfAssessmentScore);
        User.setSelfEvalReflection($scope.selfAssessmentReflection);

        // actually move to post-questionnaire by setting visibility flags
        $scope.selfAssessment = false;
        $scope.start = true;

        console.log(User.getResponse())
    };*/

    //finish the session
    $scope.finsishSession = function() {
        //check that all questions are answered 
        if ($scope.answers.filter(a => a !== undefined && a !== null && a !== "").length !== $scope.questions.length) {
            $scope.msg = "Please answer all questions!";
            return;
        } 

        var ans = $scope.answers;
        console.log(ans);

        User.setSelfEvalReflection($scope.selfAssessmentReflection);

        User.setPost(ans);

        //set end time
        User.setEndTimePosttest(new Date().getTime()); 
        console.log('Finishing posttest at: ' + User.getEndTimePosttest());

        console.log(User.getResponse());

        //prepare data for result screen
        $scope.selfEvalScore = User.getSelfEvalScore().reduce(function(acc, val) {
            return acc + val;
        }, 0);
        
        $scope.performanceSelfTask = User.getPerformanceSelfTask().reduce(function(acc, val) {
            return acc + val;
        }, 0);

        //transition to thank-you screen
        $scope.start = false;
        $scope.thankYou = true;

        //save all user data
        User.save();
    };
});
