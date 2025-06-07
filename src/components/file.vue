<template>
    <div class="app-container">
        <header class="app-header">
            <h1>Excel File Merger</h1>
            <div class="user-info">
                <div class="user-info-item">
                    <i class="fas fa-clock"></i>
                    <span>Upload multiple files</span>
                </div>
            </div>
        </header>

        <main class="app-main">
            <div class="card">
                <div class="card-header">
                    <h2>Upload Files</h2>
                </div>
                <div class="card-body">
                    <div class="file-upload-container">
                        <label for="files" class="file-upload-label">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Drag & drop files here or click to browse</span>
                        </label>
                        <input type="file" id="files" multiple ref="fileInput" @change="handleFileUpload"
                            accept=".xlsx,.xls,.csv" class="file-upload-input" />
                    </div>

                    <div v-if="fileNames.length > 0" class="file-list">
                        <h3>Uploaded Files:</h3>
                        <ul>
                            <li v-for="(name, index) in fileNames" :key="index">
                                <i class="fas fa-file-excel"></i>
                                <span>{{ name }}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div v-if="fileHeaders.length > 0" class="card mt-4">
                <div class="card-header">
                    <h2>Select Common Headers</h2>
                    <p class="text-muted">Select the column to use for merging each file</p>
                </div>
                <div class="card-body">
                    <div class="settings-row">
                        <div class="form-check">
                            <input type="checkbox" id="preserveDataTypes" v-model="preserveDataTypes"
                                class="form-check-input">
                            <label for="preserveDataTypes" class="form-check-label">
                                Preserve original data types (numbers, dates, etc.)
                            </label>
                        </div>
                    </div>

                    <div v-for="(file, index) in fileHeaders" :key="index" class="file-selection">
                        <div class="file-selection-header">
                            <i class="fas fa-file-excel"></i>
                            <span>{{ fileNames[index] }}</span>
                        </div>
                        <div class="select-container">
                            <label :for="'file-' + index">Select column to use for merging:</label>
                            <select v-model="selectedHeaders[index]" :id="'file-' + index" class="custom-select">
                                <option value="">-- Select a header --</option>
                                <option v-for="header in file" :key="header" :value="header">
                                    {{ header }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button @click="mergeFiles" :disabled="!allHeadersSelected" class="btn btn-primary"
                        :class="{ 'btn-disabled': !allHeadersSelected }">
                        <i class="fas fa-object-group"></i> Merge Files
                    </button>
                </div>
            </div>

            <div v-if="downloadLink" class="card mt-4 success-card">
                <div class="card-header">
                    <h2>Merge Complete!</h2>
                </div>
                <div class="card-body text-center">
                    <i class="fas fa-check-circle success-icon"></i>
                    <p>Your files have been successfully merged. Click the button below to download.</p>
                    <a :href="downloadLink" download="merged_file.xlsx" class="btn btn-success">
                        <i class="fas fa-download"></i> Download Merged File
                    </a>
                </div>
            </div>
        </main>

        <footer class="app-footer">
            <p>&copy; 2025 Excel File Merger. All rights reserved.</p>
        </footer>
    </div>
</template>

<script>
import * as XLSX from "xlsx";

export default {
    data() {
        return {
            fileHeaders: [], // Store headers for each file
            fileNames: [], // Store names of uploaded files
            selectedHeaders: [], // Store selected headers for each file
            downloadLink: null, // Link to the merged file
            fileData: [], // Store the actual data for each file
            headerIndexMaps: [], // Maps header names to column indices
            currentDateTime: "2025-06-07 19:14:33",
            currentUser: "rifat0rahman",
            preserveDataTypes: true
        };
    },
    computed: {
        allHeadersSelected() {
            return this.selectedHeaders.length > 0 && this.selectedHeaders.every(header => header);
        }
    },
    methods: {
        async handleFileUpload(event) {
            const files = event.target.files;
            if (files.length === 0) return;

            this.resetState();

            for (let file of files) {
                const fileBuffer = await file.arrayBuffer();
                this.fileNames.push(file.name);

                try {
                    // Read the file with SheetJS
                    const workbook = XLSX.read(fileBuffer, {
                        type: "array",
                        cellDates: this.preserveDataTypes,
                        cellNF: this.preserveDataTypes,
                        cellStyles: true
                    });

                    const allFileData = [];
                    const allHeaders = new Set();
                    const headerIndexMap = new Map();

                    // Process each sheet in the workbook
                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];

                        // Skip empty sheets
                        if (!sheet['!ref']) continue;

                        // Process the sheet data with improved header detection
                        const { headers, data, headerIndices } = this.processSheetWithImprovedHeaderDetection(sheet);

                        // Add all valid headers to our set and map
                        headers.forEach((h, idx) => {
                            if (this.isValidHeader(h)) {
                                allHeaders.add(h);
                                headerIndexMap.set(h, headerIndices[idx]);
                            }
                        });

                        // Add data to our collection
                        allFileData.push(...data);
                    }

                    // Filter headers to only include meaningful ones (excluding numeric and continued)
                    const meaningfulHeaders = [...allHeaders].filter(header =>
                        this.isValidHeader(header) && !this.isNumericHeader(header) && !header.includes("_Continued")
                    );

                    // Store all unique headers and data for this file
                    this.fileHeaders.push(meaningfulHeaders.sort());
                    this.selectedHeaders.push(""); // Initialize selection for each file
                    this.fileData.push(allFileData);
                    this.headerIndexMaps.push(headerIndexMap);
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    alert(`Error processing file ${file.name}: ${error.message}`);
                }
            }
        },

        resetState() {
            this.fileHeaders = [];
            this.selectedHeaders = [];
            this.fileNames = [];
            this.fileData = [];
            this.headerIndexMaps = [];
            this.downloadLink = null;
        },

        processSheetWithImprovedHeaderDetection(sheet) {
            // First, get all sheet data as arrays
            const rawData = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                raw: !this.preserveDataTypes,
                defval: "",
                blankrows: false
            });

            if (rawData.length === 0) {
                return { headers: [], data: [], headerIndices: [] };
            }

            // Find the actual header row, skipping title rows
            const headerInfo = this.findActualHeaderRow(rawData);
            const { headerRow, dataStartRow } = headerInfo;

            // Extract and clean the headers
            const headerCandidates = rawData[headerRow] || [];
            const { headers, headerIndices } = this.cleanAndFilterHeaders(headerCandidates);

            // Convert data rows to objects with precise column mapping
            const data = [];
            for (let i = dataStartRow; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length === 0) continue;

                const rowObj = {};
                let hasValues = false;

                headers.forEach((header, idx) => {
                    // Skip invalid headers
                    if (!this.isValidHeader(header)) return;

                    // Use the original column index for accurate data mapping
                    const originalColIndex = headerIndices[idx];

                    if (originalColIndex < row.length) {
                        rowObj[header] = row[originalColIndex];
                        if (row[originalColIndex] !== undefined && row[originalColIndex] !== null &&
                            (typeof row[originalColIndex] === 'number' || typeof row[originalColIndex] === 'boolean' ||
                                String(row[originalColIndex]).trim() !== "")) {
                            hasValues = true;
                        }
                    } else {
                        rowObj[header] = "";
                    }
                });

                // Only add rows with actual data
                if (hasValues) {
                    data.push(rowObj);
                }
            }

            return { headers, data, headerIndices };
        },

        findActualHeaderRow(rawData) {
            if (rawData.length <= 1) {
                return { headerRow: 0, dataStartRow: 1 };
            }

            // For each row, score it based on how likely it is to be a header row
            const rowScores = [];

            // Examine a reasonable number of rows
            const MAX_ROWS_TO_CHECK = Math.min(20, rawData.length - 1);

            for (let i = 0; i < MAX_ROWS_TO_CHECK; i++) {
                const row = rawData[i];
                if (!row || row.length === 0) continue;

                // Score this row
                const score = this.scoreRowAsHeader(row, i, rawData);
                rowScores.push({ index: i, score });
            }

            // Sort by score descending
            rowScores.sort((a, b) => b.score - a.score);

            // Use the highest scoring row as the header
            const headerRow = rowScores.length > 0 ? rowScores[0].index : 0;

            // Data starts on the next row
            const dataStartRow = headerRow + 1;

            return { headerRow, dataStartRow };
        },

        scoreRowAsHeader(row, rowIndex, allRows) {
            let score = 0;

            // 1. Look for common header names
            const commonHeaderTerms = [
                "productid", "product", "id", "code", "sku", "description", "name", "title",
                "color", "size", "price", "cost", "total", "quantity", "qty", "msrp", "item"
            ];

            let headerTermMatches = 0;
            let numericCells = 0;
            let emptyCell = 0;
            let goodHeaderCells = 0;

            for (const cell of row) {
                if (cell === undefined || cell === null || String(cell).trim() === "") {
                    emptyCell++;
                    continue;
                }

                if (typeof cell === 'number' || this.isNumeric(cell)) {
                    numericCells++;
                    continue;
                }

                const cellText = String(cell).toLowerCase().trim();
                if (commonHeaderTerms.some(term => cellText.includes(term))) {
                    headerTermMatches++;
                    goodHeaderCells++;
                } else if (cellText.length > 0 && cellText.length < 30) {
                    // Not too long text is probably a good header
                    goodHeaderCells++;
                }
            }

            // Headers usually have good header text
            score += headerTermMatches * 5;
            score += goodHeaderCells * 2;

            // Headers shouldn't be mostly numbers
            if (numericCells > goodHeaderCells) {
                score -= numericCells;
            }

            // Check if next row looks like data
            if (rowIndex < allRows.length - 1) {
                const nextRow = allRows[rowIndex + 1];
                if (nextRow) {
                    // Data rows often have numbers
                    const nextRowNumericCells = nextRow.filter(cell =>
                        typeof cell === 'number' || this.isNumeric(cell)
                    ).length;

                    if (nextRowNumericCells > 0) {
                        score += nextRowNumericCells;
                    }

                    // If this row has similar structure to the next row, it's less likely to be a header
                    const similarCellTypes = this.countSimilarCellTypes(row, nextRow);
                    if (similarCellTypes > row.length * 0.7) {
                        score -= 10;
                    }
                }
            }

            return score;
        },

        countSimilarCellTypes(row1, row2) {
            let count = 0;
            const minLength = Math.min(row1.length, row2.length);

            for (let i = 0; i < minLength; i++) {
                const cell1 = row1[i];
                const cell2 = row2[i];

                // Both empty
                if ((!cell1 || String(cell1).trim() === "") &&
                    (!cell2 || String(cell2).trim() === "")) {
                    count++;
                    continue;
                }

                // Both numeric
                if ((typeof cell1 === 'number' || this.isNumeric(cell1)) &&
                    (typeof cell2 === 'number' || this.isNumeric(cell2))) {
                    count++;
                    continue;
                }

                // Both text with similar length
                if (typeof cell1 === 'string' && typeof cell2 === 'string') {
                    const len1 = String(cell1).trim().length;
                    const len2 = String(cell2).trim().length;
                    if (Math.abs(len1 - len2) < 5) {
                        count++;
                    }
                }
            }

            return count;
        },

        cleanAndFilterHeaders(headerCandidates) {
            if (!headerCandidates || headerCandidates.length === 0) {
                return { headers: [], headerIndices: [] };
            }

            // First pass - clean up the headers and track original indices
            const cleanedHeaders = [];
            const headerIndices = [];

            headerCandidates.forEach((header, index) => {
                // Skip empty headers or numeric headers
                if (header === undefined || header === null || String(header).trim() === "" ||
                    this.isNumericHeader(header)) {
                    return;
                }

                // Clean up the header text
                const cleanedHeader = String(header).trim().replace(/\s+/g, ' ');

                // Skip if it's not a valid header after cleaning
                if (!this.isValidHeader(cleanedHeader)) {
                    return;
                }

                cleanedHeaders.push(cleanedHeader);
                headerIndices.push(index); // Keep track of original index
            });

            // Second pass - ensure unique names
            const uniqueHeaders = [];
            const uniqueHeaderIndices = [];
            const headerMap = new Map();

            cleanedHeaders.forEach((header, idx) => {
                // Check for duplicates
                if (headerMap.has(header)) {
                    let counter = 1;
                    let newHeader = `${header}_${counter}`;
                    while (headerMap.has(newHeader)) {
                        counter++;
                        newHeader = `${header}_${counter}`;
                    }
                    headerMap.set(newHeader, true);
                    uniqueHeaders.push(newHeader);
                    uniqueHeaderIndices.push(headerIndices[idx]);
                } else {
                    headerMap.set(header, true);
                    uniqueHeaders.push(header);
                    uniqueHeaderIndices.push(headerIndices[idx]);
                }
            });

            return {
                headers: uniqueHeaders,
                headerIndices: uniqueHeaderIndices
            };
        },

        isValidHeader(header) {
            if (!header) return false;

            const headerStr = String(header).trim();

            // Empty headers are invalid
            if (headerStr === '') return false;

            // Auto-generated Column_X headers are invalid
            if (/^Column_\d+$/.test(headerStr)) return false;

            // Don't include "Continued" headers
            if (headerStr.includes("_Continued")) return false;

            // Very short headers (1-2 chars) that are not common abbreviations are likely not valid
            if (headerStr.length < 3 && !['id', 'no', 'sn', 'mn', 'pn', 'po', 'sku', 'qty', 'mg'].includes(headerStr.toLowerCase())) {
                return false;
            }

            return true;
        },

        isNumericHeader(header) {
            if (header === undefined || header === null) return false;

            // Convert to string and check if it's numeric
            const headerStr = String(header).trim();

            // Check if it's a pure number or decimal
            if (/^-?\d+(\.\d+)?$/.test(headerStr)) return true;

            // Check if it's a size like "5.5" or "XL"
            if (/^(XS|S|M|L|XL|XXL|XXXL|\d+(\.\d+)?)$/.test(headerStr)) return true;

            return false;
        },

        isNumeric(value) {
            if (typeof value === 'number') return true;
            if (typeof value !== 'string') return false;
            return !isNaN(value) && !isNaN(parseFloat(value));
        },

        async mergeFiles() {
            if (!this.allHeadersSelected) {
                alert("Please select a common header for each file.");
                return;
            }

            try {
                // Create a normalized version of each dataset
                const normalizedDataFrames = [];

                for (let i = 0; i < this.fileData.length; i++) {
                    const selectedHeader = this.selectedHeaders[i];
                    const currentFileData = this.fileData[i];

                    if (!currentFileData || !currentFileData.length) {
                        alert(`No valid data found in file ${this.fileNames[i]}`);
                        return;
                    }

                    // Create a normalized version of the dataset
                    const normalizedData = currentFileData.map(row => {
                        // Get the merge key value
                        let mergeKeyValue = "";
                        if (row[selectedHeader] !== undefined && row[selectedHeader] !== null) {
                            mergeKeyValue = String(row[selectedHeader]).trim();
                        }

                        // Create a new row with all columns EXCEPT the selected header
                        const newRow = {};

                        Object.keys(row).forEach(key => {
                            if (key !== selectedHeader) {
                                newRow[key] = row[key];
                            }
                        });

                        // Store the merge key separately
                        newRow.__mergeKey = mergeKeyValue;

                        return newRow;
                    });

                    // Filter out rows with empty merge keys
                    const filteredData = normalizedData.filter(row => row.__mergeKey !== "");

                    if (filteredData.length === 0) {
                        alert(`No valid merge keys found in file ${this.fileNames[i]}. All values in the selected column are empty.`);
                        return;
                    }

                    normalizedDataFrames.push(filteredData);
                }

                if (normalizedDataFrames.length === 0) {
                    alert("No valid data to merge.");
                    return;
                }

                // Merge all data frames
                let mergedData = [];

                // Start with the first dataset
                mergedData = [...normalizedDataFrames[0]];

                // Merge with subsequent datasets
                for (let i = 1; i < normalizedDataFrames.length; i++) {
                    mergedData = this.mergeByCommonColumn(mergedData, normalizedDataFrames[i]);
                }

                // Get all unique headers from the merged data
                const allMergedHeaders = new Set();
                mergedData.forEach(row => {
                    Object.keys(row).forEach(key => {
                        if (key !== '__mergeKey' && this.isValidHeader(key)) {
                            allMergedHeaders.add(key);
                        }
                    });
                });

                // Use the first selected header as the common column name
                const commonColumnName = this.selectedHeaders[0];

                // Create an ordered list of headers with the common column first
                const orderedHeaders = [commonColumnName, ...Array.from(allMergedHeaders).sort()];

                // Normalize the merged data using the actual selected header name
                const normalizedMergedData = mergedData.map(row => {
                    // Start with the common key using its original name
                    const newRow = {
                        [commonColumnName]: row.__mergeKey
                    };

                    // Add all other columns
                    orderedHeaders.forEach(header => {
                        if (header !== commonColumnName) {
                            // If the column exists in the row, use its value, otherwise empty string
                            newRow[header] = row[header] !== undefined ? row[header] : "";
                        }
                    });

                    return newRow;
                });

                // Convert merged data to Excel format with the ordered columns
                const worksheet = XLSX.utils.json_to_sheet(normalizedMergedData, {
                    header: orderedHeaders
                });

                // Apply formatting to the Excel file
                this.formatWorksheet(worksheet, orderedHeaders);

                const mergedWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(mergedWorkbook, worksheet, "Merged Data");
                const excelBuffer = XLSX.write(mergedWorkbook, { bookType: "xlsx", type: "array" });

                // Create a download link
                const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
                this.downloadLink = URL.createObjectURL(blob);
            } catch (error) {
                console.error("Error merging files:", error);
                alert(`Error merging files: ${error.message}`);
            }
        },

        formatWorksheet(worksheet, headers) {
            // Set column widths based on content
            const colWidths = headers.map(header => {
                // Determine minimum width based on header type
                const lowerHeader = String(header).toLowerCase();
                let minWidth = 12;

                // Give more space to description columns
                if (lowerHeader.includes('description')) minWidth = 40;
                // Give more space to name columns
                else if (lowerHeader.includes('name') || lowerHeader.includes('title')) minWidth = 30;
                // Price columns
                else if (lowerHeader.includes('price') || lowerHeader.includes('cost') ||
                    lowerHeader.includes('msrp')) minWidth = 15;

                // Base width on header length (with calculated minimum)
                return { wch: Math.max(minWidth, String(header).length * 1.2) };
            });

            worksheet['!cols'] = colWidths;

            // Format header row
            if (!worksheet['!rows']) worksheet['!rows'] = [];
            worksheet['!rows'][0] = { hpt: 24, hpx: 24 }; // Set header row height
        },

        mergeByCommonColumn(data1, data2) {
            // Create a lookup map for the first dataset
            const keyMap = {};
            data1.forEach(row => {
                const key = row.__mergeKey;
                if (key) keyMap[key] = row;
            });

            // Create a new array for the merged results
            const mergedResults = [...data1];

            // Process data2
            data2.forEach(row => {
                const key = row.__mergeKey;

                // Skip rows with empty merge keys
                if (!key) return;

                if (keyMap[key]) {
                    // Key exists in data1, merge the properties
                    Object.keys(row).forEach(prop => {
                        if (prop !== '__mergeKey' && this.isValidHeader(prop)) {
                            keyMap[key][prop] = row[prop];
                        }
                    });
                } else {
                    // Key doesn't exist in data1, add as a new row
                    mergedResults.push(row);
                }
            });

            return mergedResults;
        }
    }
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

:root {
    --primary-color: #4361ee;
    --primary-hover: #3a56d4;
    --success-color: #2ecc71;
    --success-hover: #27ae60;
    --danger-color: #e74c3c;
    --warning-color: #f39c12;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
    --text-color: #333;
    --text-muted: #6c757d;
    --border-color: #dee2e6;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    --card-bg: #ffffff;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Poppins', sans-serif;
    color: var(--text-color);
    background-color: #f5f7fb;
    line-height: 1.6;
}

.app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 30px;
}

.app-header h1 {
    color: var(--primary-color);
    font-weight: 600;
    font-size: 28px;
}

.user-info {
    display: flex;
    gap: 20px;
}

.user-info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 14px;
}

.user-info-item i {
    color: var(--primary-color);
}

.app-main {
    margin-bottom: 40px;
}

.card {
    background-color: var(--card-bg);
    border-radius: 10px;
    box-shadow: var(--shadow);
    overflow: hidden;
    margin-bottom: 20px;
}

.card-header {
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
    background-color: rgba(67, 97, 238, 0.05);
}

.card-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--primary-color);
    margin-bottom: 5px;
}

.card-body {
    padding: 20px;
}

.card-footer {
    padding: 15px 20px;
    border-top: 1px solid var(--border-color);
    background-color: rgba(67, 97, 238, 0.03);
    display: flex;
    justify-content: flex-end;
}

.file-upload-container {
    position: relative;
    width: 100%;
    margin-bottom: 20px;
}

.file-upload-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 150px;
    border: 2px dashed var(--primary-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: rgba(67, 97, 238, 0.03);
}

.file-upload-label:hover {
    background-color: rgba(67, 97, 238, 0.07);
}

.file-upload-label i {
    font-size: 40px;
    color: var(--primary-color);
    margin-bottom: 10px;
}

.file-upload-label span {
    color: var(--text-muted);
}

.file-upload-input {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    opacity: 0;
    cursor: pointer;
}

.file-list {
    margin-top: 20px;
}

.file-list h3 {
    font-size: 16px;
    margin-bottom: 10px;
    color: var(--dark-color);
}

.file-list ul {
    list-style: none;
}

.file-list li {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
}

.file-list li:last-child {
    border-bottom: none;
}

.file-list i {
    color: var(--primary-color);
    margin-right: 10px;
}

.settings-row {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color);
}

.form-check {
    display: flex;
    align-items: center;
}

.form-check-input {
    margin-right: 10px;
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.form-check-label {
    font-size: 14px;
    cursor: pointer;
}

.file-selection {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    background-color: var(--light-color);
    transition: all 0.3s ease;
}

.file-selection:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.file-selection-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    font-weight: 500;
}

.file-selection-header i {
    color: var(--primary-color);
    margin-right: 10px;
}

.badge {
    background-color: var(--primary-color);
    color: white;
    font-size: 12px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 50px;
    margin-left: 10px;
}

.select-container {
    display: flex;
    flex-direction: column;
}

.select-container label {
    margin-bottom: 5px;
    font-size: 14px;
    color: var(--text-muted);
}

.custom-select {
    width: 100%;
    padding: 10px 15px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    background-color: white;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 15l-4.243-4.243 1.415-1.414L12 12.172l2.828-2.829 1.415 1.414z' fill='rgba(67, 97, 238, 1)'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 20px;
}

.custom-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.25);
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    border-radius: 5px;
    border: none;
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    gap: 8px;
}

.btn i {
    font-size: 16px;
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background-color: var(--primary-hover);
}

.btn-success {
    background-color: var(--success-color);
    color: white;
}

.btn-success:hover {
    background-color: var(--success-hover);
}

.btn-disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.text-muted {
    color: var(--text-muted);
}

.mt-4 {
    margin-top: 20px;
}

.success-card {
    border-left: 5px solid var(--success-color);
}

.success-icon {
    font-size: 60px;
    color: var(--success-color);
    margin: 20px 0;
}

.text-center {
    text-align: center;
}

.app-footer {
    text-align: center;
    padding: 20px 0;
    color: var(--text-muted);
    font-size: 14px;
    border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
    .app-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }

    .user-info {
        width: 100%;
        justify-content: space-between;
    }
}
</style>