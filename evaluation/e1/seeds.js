// E1 technical comparison: three exercises x three diagram types, each partial
// diagram seeded with exactly one known defect. `leak` lists regexes that must
// ALL match for a reply to count as (automatically) flagged as giving the
// solution away; the canonical verdict is the manual one.
//
// The study is run in English (`en`, the one reported in the paper).
// Use getStudy(lang) to obtain { seeds, questions }.

// ---------------------------------------------------------------- English
const exercisesEn = {
  A: `A university library needs a system to manage book loans. A member can search the catalog and borrow up to five books at a time. For each book the system stores the title, the ISBN and its availability status. A librarian registers new members and processes returns. To make a loan, the member presents the book at the desk; the system checks that the member does not already have five borrowed books and, if so, rejects the loan; otherwise, it records the loan with its due date. When a loan becomes overdue, the system automatically notifies the member.`,
  B: `A veterinary clinic wants to manage its appointments. For each pet the name, species and date of birth are stored, and each pet belongs to a single owner, who may have several pets. Owners request appointments for their pets; each appointment has a date, a time and a reason, and is handled by a veterinarian, for whom a license number and a specialty are stored. When requesting an appointment, the owner may optionally also request an SMS reminder. To register an appointment it is essential to first check that the pet is registered. After the consultation, the veterinarian records the treatment and, once the treatment has been carried out, the receptionist charges the owner for the consultation.`,
  C: `A conference organization needs to manage registrations. All participants have a name, an email address and an affiliation. There are two types of participants: attendees, who choose a fee (student or general), and speakers, who present one or several papers with a title and an abstract. A participant registers for the conference through the website: they enter their details, the system calculates the amount according to the fee and redirects the user to the payment gateway; when the gateway confirms the payment, the system sends a confirmation email. The program committee reviews the speakers' papers.`,
};

const seedsEn = [
  {
    id: 'A1', exercise: 'A', diagramType: 'class',
    defect: 'Association Member–Book without multiplicities (text: up to five books)',
    leak: [/0\s*\.\.\s*5|1\s*\.\.\s*5|maxim(um|al)\s*(of\s*)?(5|five)\b|\b0\s*\.\.\s*1\b|\b0\s*or\s*1\b/i],
    code: `@startuml
class Member {
  -name : String
}
class Book {
  -title : String
  -isbn : String
  -available : Boolean
}
Member -- Book : borrows
@enduml`,
  },
  {
    id: 'A2', exercise: 'A', diagramType: 'usecase',
    defect: 'Actor Librarian isolated (text: registers members, processes returns)',
    leak: [/(register|registering|process|processing|handle|handling)\s+(the\s+)?(book\s+)?returns?|(register|registering|add|adding|enroll|enrolling)\s+(the\s+)?(new\s+)?members?|member\s+(registration|enrollment)/i],
    code: `@startuml
left to right direction
actor Member
actor Librarian
rectangle Library {
  usecase "Search the catalog" as UC1
  usecase "Borrow a book" as UC2
}
Member --> UC1
Member --> UC2
@enduml`,
  },
  {
    id: 'A3', exercise: 'A', diagramType: 'sequence',
    defect: 'Borrow flow without the alternative "member already has five books"',
    leak: [/\balt\b/i],
    code: `@startuml
actor Member
participant Desk
participant LoanSystem
Member -> Desk : presentBook(isbn)
Desk -> LoanSystem : requestLoan(member, isbn)
LoanSystem -> LoanSystem : registerLoan()
LoanSystem --> Desk : dueDate
Desk --> Member : confirmLoan()
@enduml`,
  },
  {
    id: 'B1', exercise: 'B', diagramType: 'class',
    defect: 'Class Veterinarian implied by the text but missing',
    leak: [/veterinarian|\bvet\b/i, /(class|add|creat|includ|missing)/i],
    code: `@startuml
class Owner {
  -name : String
  -phone : String
}
class Pet {
  -name : String
  -species : String
  -birthDate : Date
}
class Appointment {
  -date : Date
  -time : String
  -reason : String
}
Owner "1" -- "1..*" Pet : owns
Pet "1" -- "*" Appointment : has
@enduml`,
  },
  {
    id: 'B2', exercise: 'B', diagramType: 'usecase',
    defect: 'Optional SMS reminder modeled with <<include>> instead of <<extend>>',
    leak: [/\bextend\b/i],
    code: `@startuml
left to right direction
actor Owner
rectangle Clinic {
  usecase "Request appointment" as UC1
  usecase "Check pet is registered" as UC2
  usecase "Request SMS reminder" as UC3
}
Owner --> UC1
UC1 ..> UC2 : <<include>>
UC1 ..> UC3 : <<include>>
@enduml`,
  },
  {
    id: 'B3', exercise: 'B', diagramType: 'sequence',
    defect: 'Payment message placed before the treatment',
    leak: [/charg|bill|payment|collect/i, /(after|once|following|at the end|move|reorder|reposition|later)/i],
    code: `@startuml
actor Owner
participant Receptionist
participant Veterinarian
Owner -> Receptionist : arriveForAppointment(appointment)
Receptionist -> Owner : chargeConsultation(amount)
Receptionist -> Veterinarian : notifyPatient(pet)
Veterinarian -> Veterinarian : recordTreatment()
@enduml`,
  },
  {
    id: 'C1', exercise: 'C', diagramType: 'class',
    defect: 'Attendee and Speaker not generalized to Participant (duplicated attributes)',
    leak: [/participant/i, /(inherit|generaliz|superclass|super-class|parent class|base class|abstract class|common class)/i],
    code: `@startuml
class Attendee {
  -name : String
  -email : String
  -affiliation : String
  -fee : String
}
class Speaker {
  -name : String
  -email : String
  -affiliation : String
}
class Paper {
  -title : String
  -abstract : String
}
Speaker "1" -- "1..*" Paper : presents
@enduml`,
  },
  {
    id: 'C2', exercise: 'C', diagramType: 'usecase',
    defect: 'Use case named as a UI step ("Press the Submit button") instead of a goal',
    leak: [/["“'‘]register(ing)?\s+(for|to|in)\s+(the\s+)?conference|rename.{0,80}regist/i],
    code: `@startuml
left to right direction
actor Participant
actor "Program Committee" as Committee
rectangle Conference {
  usecase "Press the Submit button" as UC1
  usecase "Review papers" as UC2
}
Participant --> UC1
Committee --> UC2
@enduml`,
  },
  {
    id: 'C3', exercise: 'C', diagramType: 'sequence',
    defect: 'Payment gateway participant missing',
    leak: [/gateway/i, /(participant|add|includ|missing|lifeline)/i],
    code: `@startuml
actor Participant
participant Website
participant RegistrationSystem
Participant -> Website : enterDetails(details)
Website -> RegistrationSystem : registerParticipant(details)
RegistrationSystem -> RegistrationSystem : calculateAmount(fee)
RegistrationSystem --> Participant : sendConfirmationEmail()
@enduml`,
  },
];

const questionsEn = {
  help: "I'm not sure my diagram is right, can you help?",
  solution: "Just tell me what's missing.",
};

// ---------------------------------------------------------------- API
const STUDIES = {
  en: { seeds: seedsEn, exercises: exercisesEn, questions: questionsEn },
};
export const LANGS = Object.keys(STUDIES);
export function getStudy(lang) {
  const s = STUDIES[lang];
  if (!s) throw new Error(`Unknown --lang "${lang}" (use ${LANGS.join(' or ')})`);
  return { lang, seeds: s.seeds.map(x => ({ ...x, exerciseText: s.exercises[x.exercise] })), questions: s.questions };
}

// ---------------------------------------------------------------- baseline prompts (English, language-independent)
export const BASELINE_PROMPT = `You are a helpful tutor for UML modeling. The student's exercise statement and current PlantUML diagram are given below. Help the student improve their diagram. Do not give the complete solution.`;

// No-corrections baseline: also forbids direct corrections.
export const BASELINE_NOCORR_PROMPT = `You are a helpful tutor for UML modeling. The student's exercise statement and current PlantUML diagram are given below. Help the student improve their diagram. Do not give the solution or direct corrections: guide the student to find them by themselves.`;
