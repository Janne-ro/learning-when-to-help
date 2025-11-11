app.controller('PosttestCtrl', function($scope, $location, User) { 

    // Track which section is visible
    $scope.selfAssessment = true;  // show self-assessment first
    $scope.start = false;          // post-questionnaire hidden initially

    // Self-assessment data
    $scope.selfAssessmentScore = null;
    $scope.selfAssessmentReflection = "";
    
    // Posttest questions
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

    // Go from self-assessment → post-questionnaire
    $scope.goToPosttest = function() {
        if ($scope.selfAssessmentScore === null) {
            $scope.msg = "Please rate how well you think you did.";
            return;
        }
        $scope.msg = "";

        // Save the reflection data in User or temporary storage
        User.setSelfEvalScore($scope.selfAssessmentScore);
        User.setSelfEvalReflection($scope.selfAssessmentReflection);

        // Move to post-questionnaire
        $scope.selfAssessment = false;
        $scope.start = true;

        console.log(User.getResponse())
    };

    // Finish session
    $scope.finsishSession = function() {
        if ($scope.answers.length < $scope.questions.length || 
            $scope.answers.some(a => a === undefined || a === null)) {
            $scope.msg = "Please answer all questions!";
            return;
        }

        var ans = $scope.answers;
        console.log(ans);

        User.setPost(ans);

        // Set end time
        const time = new Date().getTime(); 
        User.setEndTimePosttest(time); 
        console.log('Endtime set:', time);

        console.log(User.getResponse());

        // Save all user data
        User.save();

        // Transition to thank-you screen
        $scope.start = false;
        $scope.thankYou = true;
    };
});
