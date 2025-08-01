import { get, writable } from "svelte/store";

import { formExtendDetails } from "$lib/extentDetails";
import { formTopics } from "$lib/topics";
import { formSubjectAreas } from "$lib/subjectAreas";
import { formQuestions } from "$lib/questions";

export const data = writable<Data>(loadData())
data.subscribe((value) => localStorage.data = JSON.stringify(value))

function loadData(){ 
    /* load data from localStorage */  
    try {
        const data: Data = JSON.parse(localStorage.data);
        
        if (!isValidDataFormat(data)) {
            throw new Error('Discarding old data because DataFormat is invalid or changed')
        }       
        return data;
    } catch {
        return generateEmptyDataObject(formExtendDetails, formQuestions);
    }
}

export async function loadEvalData(filename: string){
    
    let url = import.meta.env.VITE_BUILD_URL ? import.meta.env.VITE_BUILD_URL : /* "http://localhost:8080/" */ "https://dacs-informatik.iwr.uni-heidelberg.de"

    const file = `${url}/data/${filename}`

    if (file !== null) {
        try {
            const response = await fetch(file);
            if (!response.ok) {
                throw new Error(`Unable to load file`);
            }
            let data = await response.json();

            /* if (!isValidDataFormat(data)) {
                throw new Error('Discarding old data because DataFormat is invalid or changed')
            } */ 
           
            data = expandSkills(data);
            return data;

        } catch (error) {
            console.error('Error loading file:', error);
            return generateEmptyDataObject(formExtendDetails, formQuestions);
        }
    }
}

function expandSkills(data: any): any{
    const allSkills = [...data.topics.flatMap((topic: any) => topic.subtopics)]

    const expandedSkillList: Record<Skill, boolean> = allSkills.reduce(
        (skills, item) => {skills[item] = false; return skills;}, 
        {} as Record<Skill, boolean>)

    console.log(expandedSkillList)

    data.lectures.forEach((lecture: any) => {
        let skills = JSON.parse(JSON.stringify(expandedSkillList));

        lecture.skills.forEach((skill: any) => {
            skills[skill] = true;
            
        })
        lecture.skills = skills;
    })

    return data;
}

function isEqual(obj1: any, obj2: any){
    /* quick check */
    if (Object.keys(obj1).length != Object.keys(obj2).length) return false;
    
    /* check if every key is defined and the value is equal*/
    return JSON.stringify(obj1) == JSON.stringify(obj2)
};

function generateEmptyDataObject(extentDetails: ExtentDetails, questions: Questions) {

    /* create empty data object */
	const data: Data = { extentDetails: {} as FormDataExtentDetails, topics: formTopics, lectures: [] as FormDataLectures, questions: {} as FormDataQuestions };
	
    for (const extentDetail of extentDetails){
		data['extentDetails'][extentDetail] = null
	} 
	
    /* add first lecture for convienience */
    data.lectures = [{ name: '', points: 0, description: '', subject: null, skills: {}}]
	
    for (const question of questions) {
		data['questions'][question] = '';
	}

	return data;
}

export function addLecture(){
    let newLecture: Lecture = { name: '', points: 0, description: '', subject: null, skills: {}}

    data.update((data: Data) => {
        data.lectures = [...data.lectures, newLecture]
        return data
    })
}

export function deleteLecture(idx: number){
    data.update((data: Data) => {    
    data.lectures.splice(idx ,1); 
    return data
    })
}

export function addSkill(lectureIdx: number, skill: Skill){
    
    /* get other lectures */
    const otherLectures: Array<Lecture> = JSON.parse(JSON.stringify(get(data).lectures));
    otherLectures.splice(lectureIdx,1); 
    
    /* get existing skills */
    let otherLectureSkills: Array<Skill> = []; 
    
    console.log(get(data))

    otherLectures.forEach((lecture) => {
        for (let [key, value] of Object.entries(lecture.skills)) {
            if (value) {
                otherLectureSkills.push(key);
            }
        }
    });

    /* alert if skill already exists */
    /* fs: disabled 2025-08-01 to enable multiple lectures to declare a skill
    if (otherLectureSkills.includes(skill)) {
        alert("You can only declare a skill once.\n\nPlease select the lecture that contributed the most to your skill acquisition. ")

        data.update((data: Data) => { 
            data.lectures[lectureIdx].skills[skill] = false;
            return data
        })
    } 
    */
}

export function checkDuplicateLecture(lectureIdx: number){
        
        /* ignore empty fields */
        if (get(data).lectures[lectureIdx].name === "") return;

        const lectures: Array<Lecture> = JSON.parse(JSON.stringify(get(data).lectures));

        /* splice removes the new lecture from all lectures */
        const newLecture = lectures.splice(lectureIdx,1)[0]; 

        const existing: boolean = lectures.some(lecture => 
            lecture.name.toLowerCase() === newLecture.name.toLowerCase()
        );

        if (existing) {
            alert("You can only declare a lecture once.")

            data.update((data: Data) => { 
                data.lectures[lectureIdx].name = "";
                return data
            })
        }

}

export function pointEquivalentECTS(points: number) {

    const _data = get(data);

    const extentDuration = _data.extentDetails["duration"]
    const extentPoints = _data.extentDetails["points"]

    if (!extentDuration || !extentPoints ) return 0;

    const pointEquivalent = (180 / extentPoints)  * (extentDuration / 36)

    const cp = points * pointEquivalent

    return Math.round(cp * 100) /100
} 


export function countSubjectECTS(subject: Subject) {

    const _data = get(data);

    const extentDuration = _data.extentDetails["duration"]
    const extentPoints = _data.extentDetails["points"]

    if (!extentDuration || !extentPoints ) return 0;

    const pointEquivalent = (180 / extentPoints)  * (extentDuration / 36)

    const points = _data.lectures.reduce((sum, lecture) => 
        lecture.subject === subject ? sum + lecture.points : sum, 0);

    const cp = points * pointEquivalent

    return Math.round(cp * 100) /100
} 

export function isValidDataFormat(data: Data){
    const extendDetails = data.extentDetails
    const topics = data.topics
    const questions = data.questions

    /* check extendDetails */
    if (!isEqual(Object.keys(extendDetails), formExtendDetails)) return false;

    /* check topics */
    if (!isEqual(topics, formTopics)) return false;

    /* check questions */
    if (!isEqual(Object.keys(questions), formQuestions)) return false;

    return true
}

/**
 * quick and dirty formValidation
 * perhaps implement zod or yup valdation
 */

export function isValidFormData(data: Data){
   
    let exceptions: Record<string, Record<string, string>> = {
        "extentDetails": {},
        "lectures": {},
        "subjectAreas": {},
        "questions": {},

    }

    /* check extentDetails */
    for (const extentDetail of formExtendDetails){
        if (data.extentDetails[extentDetail] == 0 || 
            data.extentDetails[extentDetail] == null ||
            data.extentDetails[extentDetail] == undefined) {
            exceptions["extentDetails"][extentDetail] = `- ${extentDetail} missing`
        }
    }
    
    for (const [lectureIdx, lecture] of data.lectures.entries()){
        let exp = "";

        if (lecture.name == '' || 
            lecture.name == null ||
            lecture.name == undefined) {
            exp = exp + "\n- Name is missing";
        } 

        if (lecture.points == 0 || 
            lecture.points == null || 
            lecture.points == undefined) {
            exp = exp + "\n- Points are missing";
        }
        if (lecture.description == '' ||
            lecture.description == null ||
            lecture.description == undefined) {
            exp = exp + "\n- Description is missing";
        }
        if (lecture.subject == '' ||
            lecture.subject == null ||
            lecture.subject == undefined)  {
            exp = exp + "\n- Lecture not assigned to subject";
            }

        // add exception
        if (exp != "") {
            exp = `Lecture ${lecture.name || lectureIdx + 1}:` + exp;
            exceptions["lectures"][lectureIdx] = exp
        }
    }

    for (const subjectArea of formSubjectAreas){
        if (countSubjectECTS(subjectArea.subject) < subjectArea.cp){
            exceptions["subjectAreas"][subjectArea.subject] = `- ${subjectArea.subject} has not enough declared ECTS points. ${subjectArea.cp - countSubjectECTS(subjectArea.subject)} points missing`;
        }
    }

    for (const [questionIdx, question] of formQuestions.entries()){
        if (data.questions[question] == '' ||
            data.questions[question] == null ||
            data.questions[question] == undefined
        ){
            exceptions["questions"][questionIdx] = `- Question ${questionIdx + 1}): answer is missing`;
        }
    }

    // check if isValid -- return
    if (Object.keys(exceptions["extentDetails"]).length === 0 &&
        Object.keys(exceptions["lectures"]).length === 0 &&
        Object.keys(exceptions["subjectAreas"]).length === 0 &&
        Object.keys(exceptions["questions"]).length === 0
    ) return true;

    
    // generate absolute sophisticated error message 
    let alertString: string = "File can not be created because some data is missing.\n\n";

    if (Object.keys(exceptions["extentDetails"]).length > 0){
        alertString += "Details on Field of Study:\n";

        for (const exp of Object.keys(exceptions["extentDetails"])){
            alertString += exceptions["extentDetails"][exp] + "\n";
        } 

        alertString += "\n";
    } 

    if (Object.keys(exceptions["lectures"]).length > 0){
        for (const exp of Object.keys(exceptions["lectures"])){
            alertString += exceptions["lectures"][exp] + "\n\n";
        } 
    } 

    if (Object.keys(exceptions["subjectAreas"]).length > 0){
         alertString += "Lecture Assignment:\n"

        for (const exp of Object.keys(exceptions["subjectAreas"])){
            alertString += exceptions["subjectAreas"][exp] + "\n";
        } 

        alertString += "\n";
    } 

    if (Object.keys(exceptions["questions"]).length > 0){
        for (const exp of Object.keys(exceptions["questions"])){
            alertString += exceptions["questions"][exp] + "\n\n";
        } 
    } 

    alert(alertString);

    return false
}
