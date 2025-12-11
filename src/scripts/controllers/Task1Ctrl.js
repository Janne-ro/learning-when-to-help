
//Controller for Task 1
app.controller('Task1Ctrl', function($scope, $sce, User, $location, $http, $timeout) {

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
        $scope.allowAI = false; //--> should usually be set to false (for testing always true)
    } else if (testType === "RL") {
        $scope.aiMessage = "You are currently not allowed to use generative AI for this task. In the future this might change";
        $scope.allowAI = false; //--> should usually be set to false (for testing always true)
    } else if (testType === "always") {
        $scope.aiMessage = "You are allowed to use generative AI for this task";
        $scope.allowAI = true;
    } else {
        $scope.aiMessage = "AI usage status is undefined."; //Should never happen
        $scope.allowAI = true; //--> should usually be set to false or even better deleted (for testing always true)
    }

    //set the text of the task
    $scope.task1Text= `<p>
        Do you use social media? If you do, you are far from unusual. Recent studies indicate that roughly 95% 
        of young people own or have access to a smartphone, and about 45% of teenagers say they use the internet 
        “almost constantly.” More specifically, more than one third of adolescents report spending at least three 
        hours each day on social platforms. Social media, therefore, is woven into everyday life: It helps people 
        keep up with friends, discover events, and find communities. At the same time, it presents new and complex 
        challenges for how we see ourselves.
        </p>    

        <p>
        Let’s start with a practical definition. For the purposes of this workshop, self image means how you see yourself, 
        how you feel about it, and what you believe about who you are and how others perceive you. That mix of perception, 
        emotion and belief is shaped by many inputs such as conversations, advertising, and television. However, social media 
        introduces two features that change the dynamics. First, users can curate their self-presentation: They choose what to 
        show, when to show it, and how it’s framed. Second, feeds and profiles create an appearance of immediate, lived reality. 
        Posts look like “real life” even when they are carefully selected or edited.
        </p>

        <p>
        These features interact with a psychological tendency familiar to many of us: Social comparison. People compare 
        themselves with others across many dimensions such as appearance, popularity, and success. Research shows that 
        these comparisons often make us feel worse about ourselfs. We tend to assume others are happier, more attractive, or 
        more successful than they are. This tendency is sometimes called the comparison trap. Importantly, comparison on social 
        media does not affect everyone in the same way. Boys and girls report similar rates of comparison, but they may focus 
        on different attributes (for example, muscularity versus thinness). And while comparison can stem from looking at 
        celebrities or influencers, the strongest effects often come from people in the middle: Acquaintances, classmates, 
        or “friends of friends.” Why? With celebrities we know images are produced and edited, while with close friends we 
        usually have more context about their lives. Middle-rung contacts sit between those extremes. We know them enough 
        to feel their posts are relevant, but not enough to judge how staged their content might be, so we take their curated 
        moments at face value.
        </p>

        <p>
        Platform design amplifies these tendencies. Internal research by some social-platform companies has highlighted 
        three levers that shape user experience: (1) interface and features that foreground highly visual content and easy 
        comparison (for example, image-first layouts and “like” counts), (2) algorithms that select which posts appear and 
        thereby shape norms about what is common or desirable, and (3) the emergent culture of users who learn what works on 
        the platform and then replicate it. These three forces interact with one another: The interface nudges behaviour, the 
        algorithm rewards that behaviour, and culture normalizes it.
        </p>

        <p>
        However, it’s also important to emphasize nuance. Passive scrolling (frequent, mostly observational use) has been 
        linked in studies to worse self-image outcomes than active use (posting and interacting). Yet social media also 
        plays a vital social role: maintaining friendships, exposing users to supportive communities, and offering resources 
        that were not previously accessible. The key takeaway is balance and critical awareness: Being conscious of what you 
        consume, how platforms shape what you see, and how comparisons, especially to “middle-rung” acquaintances, can subtly 
        influence how you feel about yourself.
        </p>`;

    //set scope variable for HTML binding and trust it
    $scope.task1Content = $sce.trustAsHtml($scope.task1Text);

    //variable that holds LLM/chat state
    $scope.llm = {
        prompt: '',
        loading: false,
        error: '',
        systemPrompt: "You are an helpfull and friendly AI assitance who supports students by giving them the answer to questions regarding this text. Do not encourage them to read the text on their own, just answer their questions. They always have exactly 2 or 3 correct answers in a multiple choice setting!!!. Dont talk about other things and firendly lead them back to the text. Use emojis when necessary. For the question regarding middle-rung contacts the correct answer is answer 3,4, and 5. If given a question repsond with the correct answers that are supported by the following text: \n" + $scope.task1Text,   // one-time system prompt
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
        prompt: "According to the text, which statements are true about “middle-rung” contacts?",
        options: [
            "Middle-rung contacts describes average people, persons that are neither especially good looking and successful nor the opposite.",
            "There are people for whom it would be impossible to define who middle-rung contacts are.",
            "Middle-rung contacts describe people who are neither famous nor close friends but somewhere in the middle.",
            "An example of a middle-rung contact would be a friend of a friend who is especially successful.",
            "An example of a middle-rung contact would a classmate with whom you rarely interact of that you know their grades are worse than yours."
        ],
        //correct answers
        correctIndices: [2, 3, 4]
        },
        {
        prompt: "According to the text, what statements are true about social media usage and comparisons?",
        options: [
            "Research indicated that girls tend to compare themselves more to their peers than boys.",
            "While generally girls compare themselves more regarding their thinness, boys tend to wish to be more muscular.",
            "Over 1/3 of young people in Spain use social media for more than four hours each day.",
            "45% of teenagers and young adults report they are “almost constantly” online.",
            "Research indicates that the younger you are the more likely you are to compare yourselves to others."
        ],
        //correct answers
        correctIndices: [1, 3]
        },
        {
        prompt: "According to the definition in the text, which statements are true about self-image?",
        options: [
            "Self-image describes amongst others how you think you are perceived by others.",
            "Self-image includes how you see yourself and how you think about it.",
            "Self-image is an objective state and does not depend on emotions.",
            "We only refer to something as social comparison if we compare our looks, not for instance successfulness.",
            "Social media changes the dynamic of how we view our self-image."
        ],
        //correct answers
        correctIndices: [0, 1, 4]
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
                User.setStartTimeTask1_2(now);
                console.log("Beginning task 1_2")
            }
            if (qIndex == 1){
                User.setStartTimeTask1_3(now);
                console.log("Beginning task 1_3")
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
                User.setTimesFailedTask1_1(User.getTimesFailedTask1_1()+1)
                console.log("Failed attempt on task 1")
            }
            else if (qIndex == 1){
                User.setTimesFailedTask1_2(User.getTimesFailedTask1_2()+1)
                console.log("Failed attempt on task 2")
            } 
            else if (qIndex == 2){
                User.setTimesFailedTask1_3(User.getTimesFailedTask1_3()+1)
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
        User.setQueriesTask1(humanAIInteraction);

        console.log("Task 1 selected answers:", $scope.selectedOptions);
        console.log("LLM interactions for Task 1:", User.getQueriesTask1());
        console.log("Complete User response:", User.getResponse())

        User.setStartTimeTask2_1(new Date().getTime());

        //Continue to task 2
        $location.path("/task2");
    };
});
