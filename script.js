// ============================================================================
// ONLINE RESULT PORTAL - MULTI-COLLEGE SYSTEM
// ============================================================================
// Database: Google Sheets (CSV method only)
// Hosting: GitHub Pages
// ============================================================================

// ============================================================================
// 1. COLLEGE CSV URL MAPPING
// ============================================================================
// HOW TO ADD NEW COLLEGES:
// 1. Add a new entry to COLLEGE_CSV_MAP with:
//    - key: Same value as in the HTML select option (e.g., 'college4')
//    - value: Object with name and csvUrl properties
// 2. Add the college option to the HTML select dropdown
// 3. Make sure the Google Sheet CSV has the exact format:
//    roll_no,student_name,standard,marathi,hindi,english,maths,science,total,result
// ============================================================================

const COLLEGE_CSV_MAP = {
    // Example College 1 - Springfield Public School
    'college1': {
        name: 'Springfield Public School',
        // REPLACE THIS URL WITH YOUR OWN GOOGLE SHEET CSV URL
        csvUrl: 'https://docs.google.com/spreadsheets/d/1YOUR_SHEET_ID_1/gviz/tq?tqx=out:csv'
    },
    
    // Example College 2 - Greenwood High School
    'college2': {
        name: 'Greenwood High School',
        // REPLACE THIS URL WITH YOUR OWN GOOGLE SHEET CSV URL
        csvUrl: 'https://docs.google.com/spreadsheets/d/1YOUR_SHEET_ID_2/gviz/tq?tqx=out:csv'
    },
    
    // Example College 3 - Riverdale College
    'college3': {
        name: 'Riverdale College',
        // REPLACE THIS URL WITH YOUR OWN GOOGLE SHEET CSV URL
        csvUrl: 'https://docs.google.com/spreadsheets/d/1YOUR_SHEET_ID_3/gviz/tq?tqx=out:csv'
    }
    
    // TO ADD MORE COLLEGES, COPY THE FORMAT ABOVE AND PASTE HERE:
    // 'college4': {
    //     name: 'Your College Name',
    //     csvUrl: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv'
    // }
};

// ============================================================================
// 2. DOM ELEMENTS
// ============================================================================
const collegeSelect = document.getElementById('collegeSelect');
const standardSelect = document.getElementById('standardSelect');
const rollNumberInput = document.getElementById('rollNumber');
const checkResultBtn = document.getElementById('checkResultBtn');
const resetBtn = document.getElementById('resetBtn');
const collegeInfo = document.getElementById('collegeInfo');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorDisplay = document.getElementById('errorDisplay');
const resultSection = document.getElementById('resultSection');

// ============================================================================
// 3. INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Update college info when selection changes
    collegeSelect.addEventListener('change', updateCollegeInfo);
    
    // Check result button click
    checkResultBtn.addEventListener('click', checkResult);
    
    // Reset button click
    resetBtn.addEventListener('click', resetForm);
    
    // Allow Enter key to trigger result check
    rollNumberInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkResult();
        }
    });
    
    // Initial college info update
    updateCollegeInfo();
});

// ============================================================================
// 4. UPDATE COLLEGE INFORMATION
// ============================================================================
function updateCollegeInfo() {
    const selectedCollege = collegeSelect.value;
    
    if (selectedCollege && COLLEGE_CSV_MAP[selectedCollege]) {
        const college = COLLEGE_CSV_MAP[selectedCollege];
        collegeInfo.innerHTML = `<i class="fas fa-info-circle"></i> Selected: <strong>${college.name}</strong>`;
        collegeInfo.style.backgroundColor = '#f0f7ff';
        collegeInfo.style.color = '#1a73e8';
    } else {
        collegeInfo.innerHTML = '<i class="fas fa-info-circle"></i> Please select a college to continue';
        collegeInfo.style.backgroundColor = '#f8f9fa';
        collegeInfo.style.color = '#5f6368';
    }
}

// ============================================================================
// 5. VALIDATE FORM INPUTS
// ============================================================================
function validateForm() {
    const college = collegeSelect.value;
    const standard = standardSelect.value;
    const rollNumber = rollNumberInput.value.trim();
    
    // Reset error display
    hideError();
    
    // Validation checks
    if (!college) {
        showError('Please select a college/school');
        collegeSelect.focus();
        return false;
    }
    
    if (!standard) {
        showError('Please select a standard/class');
        standardSelect.focus();
        return false;
    }
    
    if (!rollNumber) {
        showError('Please enter your roll number');
        rollNumberInput.focus();
        return false;
    }
    
    if (!/^\d+$/.test(rollNumber)) {
        showError('Roll number should contain numbers only');
        rollNumberInput.focus();
        return false;
    }
    
    return true;
}

// ============================================================================
// 6. CHECK RESULT - MAIN FUNCTION
// ============================================================================
async function checkResult() {
    // Validate form first
    if (!validateForm()) return;
    
    const collegeId = collegeSelect.value;
    const college = COLLEGE_CSV_MAP[collegeId];
    const standard = standardSelect.value;
    const rollNumber = rollNumberInput.value.trim();
    
    // Show loading indicator
    showLoading(true);
    hideError();
    hideResult();
    
    try {
        // 1. Get CSV URL for selected college
        const csvUrl = college.csvUrl;
        
        // 2. Fetch CSV data
        const csvData = await fetchCSVData(csvUrl);
        
        // 3. Parse CSV data
        const students = parseCSVData(csvData);
        
        // 4. Find the student
        const student = findStudent(students, standard, rollNumber);
        
        // 5. Display result
        if (student) {
            displayResult(student, college.name);
        } else {
            showError(`No result found for Roll Number: ${rollNumber} in ${standard}th Standard`);
        }
    } catch (error) {
        console.error('Error fetching result:', error);
        showError('Failed to fetch result data. Please check your connection and try again.');
    } finally {
        // Hide loading indicator
        showLoading(false);
    }
}

// ============================================================================
// 7. FETCH CSV DATA FROM GOOGLE SHEETS
// ============================================================================
async function fetchCSVData(csvUrl) {
    try {
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        return await response.text();
    } catch (error) {
        console.error('Error fetching CSV:', error);
        throw new Error('Could not connect to the result database. Please try again later.');
    }
}

// ============================================================================
// 8. PARSE CSV DATA - CRITICAL FUNCTION
// ============================================================================
// This function handles CSV parsing with proper formatting
// IMPORTANT: Follows exact CSV format: roll_no,student_name,standard,marathi,hindi,english,maths,science,total,result
// ============================================================================
function parseCSVData(csvText) {
    const students = [];
    
    // Split CSV into lines
    const lines = csvText.split('\n');
    
    // Check if we have data
    if (lines.length <= 1) {
        return students; // Empty or only header
    }
    
    // Get headers (first line)
    const headers = lines[0].split(',').map(header => 
        header.trim().replace(/"/g, '').toLowerCase()
    );
    
    // Process each data line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Parse CSV line (handling commas within quoted fields)
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue);
        
        // Clean values: remove quotes and trim spaces
        const cleanedValues = values.map(value => 
            value.replace(/"/g, '').trim()
        );
        
        // Create student object
        const student = {};
        
        // Map headers to values
        headers.forEach((header, index) => {
            if (index < cleanedValues.length) {
                // Convert numeric fields to numbers
                if (['roll_no', 'standard', 'marathi', 'hindi', 'english', 'maths', 'science', 'total'].includes(header)) {
                    student[header] = parseFloat(cleanedValues[index]) || 0;
                } else {
                    student[header] = cleanedValues[index];
                }
            }
        });
        
        // Only add student if we have required fields
        if (student.roll_no && student.student_name) {
            students.push(student);
        }
    }
    
    return students;
}

// ============================================================================
// 9. FIND STUDENT BY STANDARD AND ROLL NUMBER
// ============================================================================
function findStudent(students, standard, rollNumber) {
    // Convert inputs to appropriate types for comparison
    const searchStandard = parseInt(standard);
    const searchRollNo = parseInt(rollNumber);
    
    // Find student with matching standard and roll number
    return students.find(student => {
        const studentStandard = parseInt(student.standard) || student.standard;
        const studentRollNo = parseInt(student.roll_no) || student.roll_no;
        
        // Case-insensitive and type-safe comparison
        return studentStandard == searchStandard && studentRollNo == searchRollNo;
    });
}

// ============================================================================
// 10. DISPLAY RESULT
// ============================================================================
function displayResult(student, collegeName) {
    // Create result HTML
    const resultHTML = `
        <div class="result-card">
            <div class="result-header">
                <h3><i class="fas fa-award"></i> Marksheet - ${collegeName}</h3>
                <div class="result-status ${student.result.toLowerCase()}">${student.result}</div>
            </div>
            
            <div class="result-body">
                <div class="student-info">
                    <div class="info-item">
                        <span class="info-label">Student Name</span>
                        <span class="info-value">${student.student_name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Roll Number</span>
                        <span class="info-value">${student.roll_no}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Standard</span>
                        <span class="info-value">${student.standard}th</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">College</span>
                        <span class="info-value">${collegeName}</span>
                    </div>
                </div>
                
                <div class="marks-table-container">
                    <table class="marks-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Marks Obtained</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="subject-row">
                                <td>Marathi</td>
                                <td>${student.marathi}</td>
                                <td class="${student.marathi >= 35 ? 'pass' : 'fail'}">${student.marathi >= 35 ? 'Pass' : 'Fail'}</td>
                            </tr>
                            <tr class="subject-row">
                                <td>Hindi</td>
                                <td>${student.hindi}</td>
                                <td class="${student.hindi >= 35 ? 'pass' : 'fail'}">${student.hindi >= 35 ? 'Pass' : 'Fail'}</td>
                            </tr>
                            <tr class="subject-row">
                                <td>English</td>
                                <td>${student.english}</td>
                                <td class="${student.english >= 35 ? 'pass' : 'fail'}">${student.english >= 35 ? 'Pass' : 'Fail'}</td>
                            </tr>
                            <tr class="subject-row">
                                <td>Mathematics</td>
                                <td>${student.maths}</td>
                                <td class="${student.maths >= 35 ? 'pass' : 'fail'}">${student.maths >= 35 ? 'Pass' : 'Fail'}</td>
                            </tr>
                            <tr class="subject-row">
                                <td>Science</td>
                                <td>${student.science}</td>
                                <td class="${student.science >= 35 ? 'pass' : 'fail'}">${student.science >= 35 ? 'Pass' : 'Fail'}</td>
                            </tr>
                            <tr class="total-row">
                                <td><strong>Total Marks</strong></td>
                                <td><strong>${student.total}/500</strong></td>
                                <td class="${student.result.toLowerCase() === 'pass' ? 'pass' : 'fail'}"><strong>${student.result}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="result-actions">
                    <button id="printResultBtn" class="btn btn-primary">
                        <i class="fas fa-print"></i> Print Result
                    </button>
                    <button id="downloadResultBtn" class="btn btn-secondary">
                        <i class="fas fa-download"></i> Download as PDF
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Display result section
    resultSection.innerHTML = resultHTML;
    resultSection.style.display = 'block';
    
    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Add event listeners to result buttons
    document.getElementById('printResultBtn').addEventListener('click', printResult);
    document.getElementById('downloadResultBtn').addEventListener('click', downloadResult);
}

// ============================================================================
// 11. UTILITY FUNCTIONS
// ============================================================================
function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
    checkResultBtn.disabled = show;
}

function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
    
    // Scroll to error
    errorDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
    errorDisplay.style.display = 'none';
}

function hideResult() {
    resultSection.style.display = 'none';
}

function resetForm() {
    collegeSelect.value = '';
    standardSelect.value = '';
    rollNumberInput.value = '';
    hideError();
    hideResult();
    updateCollegeInfo();
    rollNumberInput.focus();
}

function printResult() {
    window.print();
}

function downloadResult() {
    // In a real implementation, this would generate a PDF
    // For this demo, we'll just show an alert
    alert('PDF download functionality would be implemented in a production system. For now, please use the Print function and save as PDF.');
}

// ============================================================================
// 12. DEMO DATA FOR TESTING (REMOVE IN PRODUCTION)
// ============================================================================
// Uncomment the code below to test with demo data without Google Sheets
// ============================================================================
/*
// Demo mode toggle
let demoMode = false;

// Add demo button for testing
document.addEventListener('DOMContentLoaded', function() {
    // Add demo mode toggle
    const demoButton = document.createElement('button');
    demoButton.id = 'demoModeBtn';
    demoButton.className = 'btn btn-secondary';
    demoButton.innerHTML = '<i class="fas fa-vial"></i> Enable Demo Mode';
    demoButton.style.marginTop = '15px';
    demoButton.style.marginLeft = '15px';
    
    document.querySelector('.button-group').appendChild(demoButton);
    
    demoButton.addEventListener('click', function() {
        demoMode = !demoMode;
        demoButton.innerHTML = demoMode ? 
            '<i class="fas fa-vial"></i> Disable Demo Mode' : 
            '<i class="fas fa-vial"></i> Enable Demo Mode';
        demoButton.style.backgroundColor = demoMode ? '#34a853' : '';
        
        if (demoMode) {
            alert('Demo mode enabled. You can now test with sample data.\n\nTry these roll numbers:\n- 101 (5th Standard)\n- 205 (6th Standard)\n- 312 (7th Standard)');
        }
    });
});

// Override the checkResult function for demo mode
const originalCheckResult = checkResult;
checkResult = function() {
    if (!demoMode) {
        originalCheckResult();
        return;
    }
    
    // Demo mode - use sample data
    if (!validateForm()) return;
    
    const collegeId = collegeSelect.value;
    const college = COLLEGE_CSV_MAP[collegeId];
    const standard = standardSelect.value;
    const rollNumber = rollNumberInput.value.trim();
    
    // Sample student data for demo
    const sampleStudents = [
        { roll_no: 101, student_name: 'Rahul Sharma', standard: 5, marathi: 78, hindi: 82, english: 88, maths: 92, science: 85, total: 425, result: 'PASS' },
        { roll_no: 102, student_name: 'Priya Patel', standard: 5, marathi: 65, hindi: 70, english: 75, maths: 80, science: 72, total: 362, result: 'PASS' },
        { roll_no: 201, student_name: 'Amit Kumar', standard: 6, marathi: 42, hindi: 55, english: 60, maths: 38, science: 50, total: 245, result: 'FAIL' },
        { roll_no: 205, student_name: 'Sneha Gupta', standard: 6, marathi: 85, hindi: 78, english: 90, maths: 88, science: 82, total: 423, result: 'PASS' },
        { roll_no: 301, student_name: 'Rohan Desai', standard: 7, marathi: 30, hindi: 42, english: 55, maths: 28, science: 45, total: 200, result: 'FAIL' },
        { roll_no: 312, student_name: 'Neha Singh', standard: 7, marathi: 92, hindi: 88, english: 95, maths: 96, science: 90, total: 461, result: 'PASS' },
        { roll_no: 401, student_name: 'Vikram Joshi', standard: 8, marathi: 72, hindi: 68, english: 75, maths: 80, science: 78, total: 373, result: 'PASS' },
        { roll_no: 501, student_name: 'Anjali Mehta', standard: 9, marathi: 88, hindi: 85, english: 92, maths: 90, science: 87, total: 442, result: 'PASS' },
        { roll_no: 601, student_name: 'Rajesh Nair', standard: 10, marathi: 40, hindi: 52, english: 58, maths: 45, science: 50, total: 245, result: 'FAIL' }
    ];
    
    // Find the student
    const student = sampleStudents.find(s => 
        s.standard == standard && s.roll_no == rollNumber
    );
    
    // Display result or error
    if (student) {
        displayResult(student, college ? college.name : 'Demo College');
    } else {
        showError(`No result found for Roll Number: ${rollNumber} in ${standard}th Standard\n\nDemo Mode Tip: Try 101 for 5th, 205 for 6th, or 312 for 7th`);
    }
};
*/
