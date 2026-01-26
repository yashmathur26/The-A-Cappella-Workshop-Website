import arjunPhoto from "@gallery/arjun.png";
import shuntaviPhoto from "@gallery/shuntavi.png";
import yashPhoto from "@gallery/yash.png";

export const WEEKS = [
  { id: "wk1", label: "June 22–26, 2026", price: 500, spots: 20 },
  { id: "wk2", label: "July 27–31, 2026", price: 500, spots: 20 },
  { id: "wk3", label: "August 3–7, 2026", price: 500, spots: 20 },
  { id: "wk4", label: "August 10–14, 2026", price: 500, spots: 20 },
  { id: "wk5", label: "August 17–21, 2026", price: 500, spots: 20 }
];

export const STAFF_BIOS = [
  {
    id: "arjun",
    name: "Arjun Kumar",
    title: "Lexington Co-President",
    bio: "Arjun Kumar is a sophomore at Tufts University and is thrilled to be returning to the 'Shop for his second year as Co-President! At Lexington High School, he was a leader and arranger for Peanut Butter & Jelly, one of Lexington High School's mixed voice a cappella groups. He was also a part of Repertoire Orchestra, Concert Choir, and Madrigal Singers. Arjun was a student, TA, and teacher at The 'Shop and is hyped to return this summer!",
    imageUrl: arjunPhoto,
    imageClassName: "",
  },
  {
    id: "yash",
    name: "Yash Mathur",
    title: "Lexington Co-President",
    bio: "Yash is a sophomore at the University of Massachusetts. At Lexington High School, he sang in Peanut Butter & Jelly as the main arranger, performed with Madrigal Singers and Concert Choir, and took part in Singing Valentines during his junior and senior years. Yash can't wait to welcome a new group of students to the Workshop this summer.",
    imageUrl: yashPhoto,
    // Zoom/crop so face is centered (the original is framed wide)
    imageClassName: "scale-[1.25] origin-center object-[50%_20%]",
  },
  {
    id: "shuntavi",
    name: "Shuntavi Schuman-Olivier",
    title: "Lexington Co-President",
    bio: "Shuntavi is a freshman at Tufts University. At Lexington High School, she sang in Chamber Singers and Concert Choir, participated in Singing Valentines, and co-led Noteworthy, one of Lexington High School's co-ed a cappella groups. She has attended the A Cappella Academy in LA and taught for two years at the 'Shop before becoming a co-president. She loves getting to bring a cappella to each new generation of singers!",
    imageUrl: shuntaviPhoto,
    imageClassName: "",
  }
];
