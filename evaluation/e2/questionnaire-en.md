# E2 questionnaire (English version shown to respondents)

Scales: 1–5, Strongly disagree / Disagree / Neither agree nor disagree / Agree / Strongly agree; every rating also offers "I don’t know / not shown in the video".

## Part 0: about you

- **exp_years**: How many years have you been teaching UML or modeling? (0 to 2 / 3 to 5 / 6 to 10 / More than 10)
- **courses**: In which courses do you teach or have you taught UML or modeling?
- **university**: At which university do you teach or have you taught UML or modeling?
- **ai_use**: Have you used AI chat assistants in your teaching? (Never / Occasionally / Regularly)
- **watched**: Did you watch the entire video? (All of it / Most of it / Only part of it)
- **modelau_use**: How have you used ModelaU? (I haven’t used it / I explored it without working on an exercise / I used it to work on one exercise / I used it to work on several exercises)
- **modelau_experience**: If you have used ModelaU, describe your experience. (optional)

## Part A: ModelaU compared with the conventional chat in the video

Each statement is rated twice, once for ModelaU (`_mu`) and once for the conventional chat (`_chat`). "Feedback …"

- **A_specific** (Specific): points to the exact part of the student’s work it addresses (for example, a particular class, relationship, or step of the diagram), rather than giving general comments such as “review your diagram”
- **A_selective** (Selective): focuses on a single issue per interaction, the most important at that moment, rather than listing every issue that could be raised at once
- **A_timely** (Timely): arrives while the student’s attempt is still in progress (for example, when they seem stuck or make a structural mistake), and not only when they explicitly ask, which may be too late
- **A_context** (Contextualized): adapts to the stage of the task the student is at (for example, identifying classes or defining relationships), without imposing a fixed order between stages

## Part B: the eight mechanisms

For each mechanism: **B_<key>_rel** "This mechanism helps feedback <dimension>." and **B_<key>_intr** "This mechanism would get in the student’s way while modeling."

- **cite** — Referencing exact names (Specific; rel: "This mechanism helps feedback be specific"). The tutor refers to the elements of the student’s work (classes, attributes, actors, or use cases) by the exact names they have in the diagram, rather than vague phrases such as “that class” or “that relationship”. The aim is for the student to know without doubt which part of their work is being discussed.
- **highlight** — Highlighting verified diagram elements (Specific; rel: "This mechanism helps feedback be specific"). When the tutor mentions diagram elements, the interface outlines them so the student can find them at a glance. Before outlining them, the server checks that each one really exists in the diagram, so nothing invented by the model is ever pointed at.
- **single** — One issue per response (Selective; rel: "This mechanism helps feedback be selective"). Each response focuses on a single issue, the most relevant at that moment, and ends with a question. Other possible issues wait for later interactions. The aim is for the student to act on the comment without being overwhelmed by a list of corrections.
- **cap** — At most three highlights per response (Selective; rel: "This mechanism helps feedback be selective"). The interface outlines at most three diagram elements per response, even if the problem affects more. The marks serve as examples: the student sees a few and can be the one to find the others, instead of having everything pointed out. The aim is not to give the student more than they can handle at once; the tutor’s message may name more elements, but only three are marked.
- **nudge** — Inactivity prompt (Timely; rel: "This mechanism helps feedback arrive at the right time"). If the student has been inactive for a few minutes and the diagram is still incomplete, a bubble appears next to the tutor offering help, without opening anything on its own. The aim is to reach a student who is stuck before they give up, without interrupting one who is simply thinking.
- **edit_checks** — Checks while editing (Timely; rel: "This mechanism helps feedback arrive at the right time"). While the student edits, a set of rules checks for structural problems (for example, a relationship without multiplicity) and flags them immediately, without consulting the language model. The aim is to point out the mistake at the moment it is made, without waiting for the student to ask.
- **step** — Detecting the current modeling step (Contextualized; rel: "This mechanism helps feedback fit the context"). From the student’s diagram, the tool infers which modeling step the student is at (for example, identifying classes or defining relationships) and adapts its hints to that step, without imposing an order. The aim is for the hint to fit the moment rather than be generic advice; the student can change the step by hand.
- **vocab** — Shared vocabulary for highlights (Contextualized; rel: "This mechanism helps feedback fit the context"). The parts of the exercise statement that the tutor mentions are color-coded by type (requirement, actor, needs clarification) and underlined if they are not yet in the diagram. The aim is for the student to see, on the statement itself, what remains to be modeled.
- **B_integrated**: It is useful for students to have the tutor in the design workspace so they can avoid copying the diagram and exercise prompt into a separate chat.

## Part C: usefulness and adoption

- **C_relative**: I would prefer my students to use ModelaU over a general-purpose chat for these exercises.
- **C_useful**: Using ModelaU would help my students learn modeling.
- **C_complex**: ModelaU’s mechanisms are easy to understand.
- **C_compat**: ModelaU fits the way I teach modeling.
- **C_intent**: I would try ModelaU in one of my courses.
- **C_worry**: I worry that students might rely on the tool instead of thinking for themselves.

## Part D: open questions (optional)

- **D_liked**: What did you like about ModelaU?
- **D_disliked**: What did you dislike about ModelaU?
- **D_comments**: Any other comments
