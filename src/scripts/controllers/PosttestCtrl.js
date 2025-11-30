app.controller('PosttestCtrl', function($scope, $location, User) { 

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
    $scope.start = false;          

    //self-assessment data
    $scope.selfAssessmentScore = null;
    $scope.selfAssessmentReflection = "";
    
    //Posttest questions (identical to pretest)
    $scope.questions = [
        "How does the use of AI make you feel about your future Career prospects?",
        "How beneficial do you believe using AI is for the learning Outcomes when studying?",
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

    //go from self-assessment to post-questionnaire if everything is filled out
    $scope.goToPosttest = function() {
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
    };

    //finish the session
    $scope.finsishSession = function() {
        //check that all questions are answered 
        if ($scope.answers.filter(a => a !== undefined && a !== null && a !== "").length !== $scope.questions.length) {
            $scope.msg = "Please answer all questions!";
            return;
        } 

        var ans = $scope.answers;
        console.log(ans);

        User.setPost(ans);

        //set end time
        User.setEndTimePosttest(new Date().getTime()); 
        console.log('Finishing posttest at: ' + User.getEndTimePosttest());

        console.log(User.getResponse());

        //prepare data for result screen
        $scope.selfEvalScore = User.getSelfEvalScore();
        $scope.performanceSelfTask = User.getPerformanceSelfTask();

        //transition to thank-you screen
        $scope.start = false;
        $scope.thankYou = true;

        //save all user data
        User.save();
    };
});
