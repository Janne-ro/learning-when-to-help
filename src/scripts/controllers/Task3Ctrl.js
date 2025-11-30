
//Controller for Task 3
app.controller('Task3Ctrl', function($scope, $sce, User, $location, $http, $timeout) {

    //scroll to the top after loading page
    $timeout(function () {
        window.scrollTo(0, 0);
    }, 0);

    //Get test type (already implemented elsewhere)
    const testType = User.getTestType();

    //Set allow ai flag based on test type
    $scope.allowAI = false; 

    //Display different messages based on test type
    if (testType === "never") {
        $scope.aiMessage = "You are not allowed to use generative AI for this task";
        $scope.allowAI = false; 
    } else if (testType === "RL") {
        $scope.aiMessage = "You are currently not allowed to use generative AI for this task. In the future this might change";
        $scope.allowAI = false;
    } else if (testType === "always") {
        $scope.aiMessage = "You are allowed to use generative AI for this task";
        $scope.allowAI = true;
    } else {
        $scope.aiMessage = "AI usage status is undefined."; //Should never happen
        $scope.allowAI = true; //--> should usually be set to false or even better deleted (for testing always true)
    }

    //set the text of the task
    $scope.task3Text= `<p>
        After exploring how platform features, algorithms, and online culture shape our experiences on social media, 
        it is equally important to understand what we can do about it. Social media is a normal part of everyday life 
        and, for many people, an enjoyable one. It helps us stay connected with friends and family, follow interests, 
        join communities, and share moments that matter. But as we have seen, certain kinds of content, especially highly 
        visual, idealized, or repetitively recommended content, can gradually influence how we see ourselves. The goal is 
        not to stop using social media altogether, but to use it in a way that protects our sense of self-image and well-being.
        </p>    

        <p>
        A practical first step is to pay attention to how different apps make you feel. 
        This may sound simple, but the effect can be surprisingly strong. Specific platforms, 
        creators, or content types may consistently leave you feeling worse about your appearance, 
        achievements, or social life. In those cases, it can be helpful to remove the app from 
        your phone or take a break from it entirely. Deleting an app does not need to be permanent, 
        some people reinstall it later once they feel more grounded. But even a temporary break can 
        interrupt patterns of comparison or overexposure.
        </p>

        <p>
        Another strategy involves setting limits. Because feeds are designed to make scrolling effortless, 
        people often spend more time online than they intended. The more time you spend on picture-based 
        platforms, the more likely you are to encounter polished, curated moments that invite comparison. 
        One way to counter this is to decide on a time limit before you open the app, some people use 
        specialized apps, others use built-in screen-time tools. A simple limit can help prevent the kind 
        of extended scrolling session that leaves you feeling drained or inadequate. Capping your use does 
        not mean avoiding social media. It simply helps ensure that it fits into your day in a balanced and 
        healthy way.
        </p>

        <p>
        A further tool is to manage what your feed shows you. Many platforms now include functions such 
        as “see fewer posts like this,” “not interested,” or “hide.” These options tell the algorithm to 
        stop pushing certain types of content toward you. If you notice that particular topics trigger 
        negative feelings, using these tools can reduce how often they appear. Because algorithms tend to 
        reinforce what you look at, even once, actively curating your feed helps prevent an unhelpful 
        recommendation spiral from forming.
        </p>

        <p>
        Stepping back, it is crucial to remember that social media does not have a single purpose 
        or a single “correct” way to use it. People go online for all kinds of reasons: To talk to friends, 
        watch videos, follow hobbies, share creative work, or simply relax. What affects one person 
        negatively might not affect another in the same way. The key is to stay aware of your own reactions 
        and to recognize when a particular corner of your feed begins to shape your self-image in unhealthy ways.
        </p>
        
        <p>
        Using social media thoughtfully does not mean giving it up. It means being intentional about what 
        you see, how long you spend online, and how you allow digital environments to influence your sense 
        of who you are. With small adjustments, like reducing exposure to harmful content, limiting time 
        online, and removing apps that undermine your well-being, you can continue to enjoy the benefits of 
        social media while protecting your self-image and feeling more in control of your online experience.
        <\p>
        `;

    //set scope variable for HTML binding and trust it
    $scope.task3Content = $sce.trustAsHtml($scope.task3Text);

    //variable that holds LLM/chat state
    $scope.llm = {
        prompt: '',
        loading: false,
        error: '',
        systemPrompt: "You are an helpfull and friendly AI assitance who supports students by giving them the answer to questions regarding this text (they always have 2 or 3 correct answers in a multiple choice setting). Dont talk about other things and firendly lead them back to the text. Also never include ** in your answer: \n" + $scope.task3Text,   // one-time system prompt
    };

    //Array of chat messages (can be deleted by clear chat)
    //each message has: { who: 'user'|'ai', text: '...' }
    $scope.messages = [];

    //create variable for overall ai messages (including clear chat commands) --> different from scope.messages only in that sense
    var humanAIInteraction = [];

    //backend URL on which the llm api is hosted
    var backendUrl = 'http://localhost:8080/api/ask-ai'; 

    //helper function that scrolls to the bottom
    function scrollToBottom(delay) {
        //give DOM a tick to render
        $timeout(function() {
            var el = document.getElementById('llm-messages');
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        }, delay || 50);
    }

    //send the message to the LLM
    $scope.sendToLLM = function() {
        var text = ($scope.llm.prompt || '').trim();
        if (!text) {
            $scope.llm.error = 'Please type something to send.';
            return;
        }

        // push user message locally (so that the UI shows it immediately)
        $scope.messages.push({ who: 'user', text: text });
        humanAIInteraction.push({ who: 'user', text: text });

        $scope.llm.prompt = '';
        $scope.llm.loading = true;
        $scope.llm.error = '';
        scrollToBottom(0);

        //build messages array for LLM: map local roles to model roles.
        //convert 'ai' -> 'assistant', 'user' -> 'user', 'system' -> 'system' to not confuse the LLM when pushing to history
        const messagesForLLM = humanAIInteraction.map(m => {
            let role = (m.who === 'ai') ? 'assistant' : (m.who === 'system') ? 'system' : 'user';
            return { role: role, content: m.text };
        });

        //ensure the system prompt is included at the start
        //this prevents accidentally losing instruction when clearing or page load.
        if ($scope.llm.systemPrompt && $scope.llm.systemPrompt.trim() !== '') {
            if (!messagesForLLM.length || messagesForLLM[0].role !== 'system' || messagesForLLM[0].content !== $scope.llm.systemPrompt) {
                messagesForLLM.unshift({ role: 'system', content: $scope.llm.systemPrompt });
            }
        }

        // post to backend: send the full messages array as context
        const payload = { messages: messagesForLLM };

        $http.post(backendUrl, payload)
        .then(function(res) {
            var reply = (res.data && res.data.reply) ? res.data.reply : '(no reply)';
            $scope.messages.push({ who: 'ai', text: reply });
            humanAIInteraction.push({ who: 'ai', text: reply });
        })
        .catch(function(err) {
            console.error('LLM call failed:', err);
            var errMsg = (err && err.data && err.data.error) ? err.data.error : 'AI service error';
            $scope.messages.push({ who: 'ai', text: 'Error: ' + errMsg });
            humanAIInteraction.push({ who: 'ai', text: 'Error: ' + errMsg });
        })
        .finally(function() {
            $scope.llm.loading = false;
            scrollToBottom(120);
        });
    };


    //enter to send, Shift+Enter newline
    $scope.handleKeydown = function(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            $scope.sendToLLM();
        }
    };

    //clear input (button)
    $scope.clearLLM = function() {
        $scope.llm.prompt = '';
        $scope.llm.error = '';
    };

    //Clear the conversation
    $scope.clearConversation = function() {
        $scope.messages = [];
        $scope.llm.prompt = '';
        $scope.llm.error = '';
        humanAIInteraction = [];            // reset conversation history so context is gone
        // if you want to indicate it in the UI as well:
        humanAIInteraction.push({ who: 'system', text: '[Conversation cleared]' });
    };

    //focus input convenience
    $scope.focusInput = function() {
        $timeout(function() {
            var ta = document.querySelector('.chat-input textarea');
            if (ta) ta.focus();
        }, 10);
    };

    //initial scroll
    $timeout(scrollToBottom, 200);

    //Part on the questions the user has to answer
    //each question has a prompt, 5 options and an array of correct option indices
    $scope.questions = [
        {
        prompt: "According to the text, which statements are true about social media apps?",
        options: [
            "Social media apps should not be viewed as a normal part of everyday life.",
            "The aim shouldn’t be necessarily to quit social media, but to engage with it in a way that safeguards our self-image and well-being.",
            "Generally all social media platforms leave the same either negative or positive expression on us.",
            "If you deleted an app it’s always better to not reinstall it at a later date.",
            "A temporary break from an app can sometimes help to feel more grounded."
        ],
        //correct answers
        correctIndices: [1, 4]
        },
        {
        prompt: "According to the text, which statements are true about setting time limits?",
        options: [
            "The more time you spend on image-focused platforms, the more likely you are to see curated, polished moments that prompt comparison.",
            "Since feeds are built for effortless scrolling, people often end up staying online longer than they planned.",
            "Experts recommend only spending up to 15 minutes on each social media platform per day.",
            "Caping your use of social media use is synonymous with avoiding it.",
            "A helpful way to deal with stressful social media experiences is to set yourself a timer for how long you want to use it."
        ],
        //correct answers
        correctIndices: [0, 1, 4]
        },
        {
        prompt: "According to the text, which statements are true about managing your feed?",
        options: [
            "Using “see fewer posts” functions tells the algorithm to reduce certain content.",
            "Hiding posts normally causes creators to be blocked automatically.",
            "Feed-management tools (like hiding posts) are a great way to stop the platform from collecting data about you.",
            "Adjusting your feed only changes what appears temporarily, because the algorithm always reverts to its default recommendations.",
            "Managing your feed can prevent an unhelpful recommendation spiral from forming."
        ],
        //correct answers
        correctIndices: [0, 4]
        }
    ];

    //track which question is currently active (only this can be interacted with)
    $scope.currentQuestionIndex = 0;

    //define currently selected options flags
    $scope.selectedOptions = [];
    $scope.questions.forEach(function(q, i) {
        $scope.selectedOptions[i] = new Array(q.options.length).fill(false);
    });

    //track which questions have been answered correctly
    $scope.answeredCorrect = new Array($scope.questions.length).fill(false);

    //messages that will be displayed for incorrect attempts
    $scope.messagesQuestionsIncorrect = new Array($scope.questions.length).fill('');

    //helper function to check whether selected options are equal the correct set (set equality)
    $scope.isAnswerCorrect = function(qIndex) {
        var selected = [];
        $scope.selectedOptions[qIndex].forEach(function(val, idx) {
            if (val) selected.push(idx);
        });
        //sort both arrays for reliable comparison
        selected.sort(function(a,b){return a-b;});
        var correct = ($scope.questions[qIndex].correctIndices || []).slice().sort(function(a,b){return a-b;});
        //check if all questions are correct
        if (selected.length !== correct.length) return false;
            for (var i=0; i<selected.length; i++) {
                if (selected[i] !== correct[i]) return false;
            }
        return true;
    };

    //function thas called when user presses "Check answer" for current question
    $scope.checkAnswer = function(qIndex) {
        //prevent checking if not active question
        if (qIndex !== $scope.currentQuestionIndex) return;

        if ($scope.isAnswerCorrect(qIndex)) {
            $scope.answeredCorrect[qIndex] = true;
            $scope.messagesQuestionsIncorrect[qIndex] = '';
            // record start time for the next question
            const now = new Date().getTime()

            if (qIndex == 0){
                User.setStartTimeTask3_2(now);
                console.log("Beginning task 3_2")
            }
            if (qIndex == 1){
                User.setStartTimeTask3_3(now);
                console.log("Beginning task 3_3")
            }

            //unlock next question if any
            if ($scope.currentQuestionIndex < $scope.questions.length - 1) {
                $scope.currentQuestionIndex++;
            }
        } else {
            $scope.answeredCorrect[qIndex] = false;
            $scope.messagesQuestionsIncorrect[qIndex] = "Your selection is incorrect. Make sure you select all and only the correct choices. If you have access you can use the generative AI!";
            //update times failed
            if (qIndex == 0){
                User.setTimesFailedTask3_1(User.getTimesFailedTask3_1()+1)
                console.log("Failed attempt on task 1")
            }
            else if (qIndex == 1){
                User.setTimesFailedTask3_2(User.getTimesFailedTask3_2()+1)
                console.log("Failed attempt on task 2")
            } 
            else if (qIndex == 2){
                User.setTimesFailedTask3_3(User.getTimesFailedTask3_3()+1)
                console.log("Failed attempt on task 3")
            }
        }
    };

    //toggle option helper (only allowed for the active question and if not already marked correct)
    $scope.toggleOption = function(qIndex, optIndex) {
        if (qIndex !== $scope.currentQuestionIndex) return;
        if ($scope.answeredCorrect[qIndex]) return;
        $scope.selectedOptions[qIndex][optIndex] = !$scope.selectedOptions[qIndex][optIndex];
    };

    //function updated submitTask that only allows progression if all questions were answered correctly (in order)
    $scope.submitTask = function() {
        //check that all questions are answered correctly
        var allCorrect = $scope.answeredCorrect.every(function(x) { return x === true; });

        if (!allCorrect) {
            $scope.msg = "Please answer each question correctly before proceeding. Questions unlock sequentially.";
            //also show per-question feedback if available (messagesQuestionsIncorrect already contains them)
            return;
        }

        //If all answers are correct -> continue to next task
        User.setQueriesTask3(humanAIInteraction);

        console.log("Task 3 selected answers:", $scope.selectedOptions);
        console.log("LLM interactions for Task 3:", User.getQueriesTask3());
        console.log("Complete User response:", User.getResponse())

        //Continue to distractor task
        $location.path("/gate");
    };
});
