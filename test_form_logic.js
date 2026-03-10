const fields = [
  {
    "type": "TEXT",
    "label": "Nombre",
    "name": "field_1773168181114"
  }
];

const submissionData = {
  "field_1773168181114": "oswaldo"
};

let email = null;
let phone = null;
let firstName = "New Lead"; // Default if not found
let lastName = null;
const customNotes = [];

for (const field of fields) {
    const submittedValue = submissionData[field.name];

    if (submittedValue !== undefined && submittedValue !== null && submittedValue !== "") {
        
        const fName = field.name.toLowerCase();
        const fLabel = field.label.toLowerCase();

        // Try to map to standard Contact object properties
        if (field.type === "EMAIL" && !email) {
            email = typeof submittedValue === 'string' ? submittedValue : String(submittedValue);
        } else if (field.type === "PHONE" && !phone) {
            phone = typeof submittedValue === 'string' ? submittedValue : String(submittedValue);
        } else if (field.type === "TEXT" && (fName.includes("last") || fName.includes("apellido") || fLabel.includes("last") || fLabel.includes("apellido")) && !lastName) {
            lastName = String(submittedValue);
        } else if (field.type === "TEXT" && (fName.includes("name") || fName.includes("nombre") || fLabel.includes("name") || fLabel.includes("nombre")) && firstName === "New Lead") {
            firstName = String(submittedValue);
        } else {
            // Formatting array values (like checkboxes)
            const valueString = Array.isArray(submittedValue) ? submittedValue.join(", ") : String(submittedValue);
            customNotes.push(`${field.label}: ${valueString}`);
        }
    }
}

console.log("firstName:", firstName);
console.log("customNotes:", customNotes);
