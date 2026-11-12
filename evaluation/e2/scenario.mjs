// The demonstration scenario: a fresh exercise (not one of the nine evaluated diagrams nor the tuning diagrams).
export const EXERCISE = `A gym manages memberships and classes. Every person who uses the gym has a name and an email address. Members also have a membership plan and a start date; trainers also have a specialty. Members book places in classes; each class has a title, a schedule and a maximum capacity, and is run by one trainer. A member can book several classes and a class has many members. When a member books a class, the system checks that there are free places and sends a confirmation message. The receptionist signs up newcomers and charges the monthly fee.`;

export const MEMBER = `class Member {
  -name : String
  -email : String
  -plan : String
  -startDate : Date
}`;
export const REST = `class Trainer {
  -name : String
  -email : String
  -specialty : String
}
class GymClass {
  -title : String
  -schedule : String
  -capacity : Integer
}`;
export const RELATIONS = `Member -- GymClass : books
Trainer "1" -- "*" GymClass : runs`;
// One extra line: the public PlantUML server (currently a beta build) lays out the SVG of some class diagrams with broken
// font metrics (overlapping or squeezed boxes). `hide circle` avoids it for every stage of this demo; without it the
// preview of the three-class diagram is garbled.
export const wrap = body => `@startuml\nhide circle\n${body}\n@enduml`;
export const QUESTION = "I'm not sure my diagram is right, can you help?";
export const QUESTION_2 = "Who handles the payment part of the text? I don't see it in my diagram.";

// Scene of mechanism 4 (at most three diagram highlights per reply): a later stage of the same diagram, with more classes
// and several open problems (four classes repeat name and email), and a question that invites the tutor to point at them.
export const LATER = `class Member {
  -name : String
  -email : String
  -plan : String
  -startDate : Date
}
class Trainer {
  -name : String
  -email : String
  -specialty : String
}
class Receptionist {
  -name : String
  -email : String
}
class Newcomer {
  -name : String
  -email : String
}
class GymClass {
  -title : String
  -schedule : String
  -capacity : Integer
}
class Booking {
  -date : Date
}
Member -- Booking : makes
Booking -- GymClass : for
Trainer "1" -- "*" GymClass : runs
Receptionist -- Newcomer : signs up`;
export const QUESTION_3 = 'Which of my classes repeat the same data? Can you show me all of them in the diagram?';
