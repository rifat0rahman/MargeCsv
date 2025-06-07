<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Excel Tab Merger</h1>
      <div class="user-info">
        <div class="user-info-item">
          <i class="fas fa-clock"></i>
          <span>Upload single file with multiple tabs.</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="card">
        <div class="card-header">
          <h2>Upload Excel File</h2>
        </div>
        <div class="card-body">
          <div class="file-upload-container">
            <label for="file" class="file-upload-label">
              <i class="fas fa-cloud-upload-alt"></i>
              <span>Drag & drop Excel file here or click to browse</span>
            </label>
            <input type="file" id="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls"
              class="file-upload-input" />
          </div>

          <div v-if="fileName" class="file-list">
            <h3>Uploaded File:</h3>
            <div class="uploaded-file">
              <i class="fas fa-file-excel"></i>
              <span>{{ fileName }}</span>
            </div>

            <div v-if="sheetNames.length > 0" class="sheet-list">
              <h4>Available Sheets:</h4>
              <ul>
                <li v-for="(sheet, index) in sheetNames" :key="index">
                  <i class="fas fa-table"></i>
                  <span>{{ sheet }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div v-if="sheetHeaders.length > 0" class="card mt-4">
        <div class="card-header">
          <h2>Select Common Headers</h2>
          <p class="text-muted">Select the column to use for merging each sheet</p>
        </div>
        <div class="card-body">
          <div class="settings-row">
            <div class="form-check">
              <input type="checkbox" id="handleDuplicates" v-model="handleDuplicateKeys" class="form-check-input">
              <label for="handleDuplicates" class="form-check-label">
                Merge rows with duplicate common values (combines data from all duplicates)
              </label>
            </div>
          </div>

          <div v-for="(sheet, index) in sheetHeaders" :key="index" class="file-selection">
            <div class="file-selection-header">
              <i class="fas fa-table"></i>
              <span>{{ sheetNames[index] }}</span>
            </div>
            <div class="select-container">
              <label :for="'sheet-' + index">Select column to use for merging:</label>
              <select v-model="selectedHeaders[index]" :id="'sheet-' + index" class="custom-select">
                <option value="">-- Select a header --</option>
                <option v-for="header in sheet" :key="header" :value="header">
                  {{ header }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <button @click="mergeSheets" :disabled="!allHeadersSelected" class="btn btn-primary"
            :class="{'btn-disabled': !allHeadersSelected}">
            <i class="fas fa-object-group"></i> Merge Sheets
          </button>
        </div>
      </div>

      <div v-if="downloadLink" class="card mt-4 success-card">
        <div class="card-header">
          <h2>Merge Complete!</h2>
        </div>
        <div class="card-body text-center">
          <i class="fas fa-check-circle success-icon"></i>
          <p>Your sheets have been successfully merged. Click the button below to download.</p>
          <a :href="downloadLink" download="merged_sheets.xlsx" class="btn btn-success">
            <i class="fas fa-download"></i> Download Merged File
          </a>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>&copy; 2025 Excel Tab Merger. All rights reserved.</p>
    </footer>
  </div>
</template>

<script>
import * as XLSX from "xlsx";

export default {
  data() {
    return {
      fileName: null,
      sheetNames: [],
      sheetHeaders: [],
      sheetData: [],
      sheetRowCounts: [],
      selectedHeaders: [],
      downloadLink: null,
      handleDuplicateKeys: true,
      currentDateTime: "2025-06-06 16:49:24",
      currentUser: "rifat0rahman",
      headerDetectionMode: "auto" // Auto detect best header row
    };
  },
  computed: {
    allHeadersSelected() {
      return this.selectedHeaders.length > 0 && this.selectedHeaders.every(header => header);
    }
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.fileName = file.name;
      this.sheetNames = [];
      this.sheetHeaders = [];
      this.sheetData = [];
      this.sheetRowCounts = [];
      this.selectedHeaders = [];
      this.downloadLink = null;

      try {
        const fileBuffer = await file.arrayBuffer();
        
        // Read the file with SheetJS
        const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
        
        // Get sheet names
        this.sheetNames = workbook.SheetNames;
        
        // Skip if no sheets found
        if (this.sheetNames.length === 0) {
          alert("No sheets found in the uploaded file.");
          return;
        }

        // Process each sheet
        for (const sheetName of this.sheetNames) {
          const sheet = workbook.Sheets[sheetName];
          
          // Skip empty sheets
          if (!sheet['!ref']) {
            this.sheetHeaders.push([]);
            this.sheetData.push([]);
            this.sheetRowCounts.push(0);
            this.selectedHeaders.push("");
            continue;
          }
          
          // Get the raw data as arrays with all options to ensure we capture all data
          const rawData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1,  // Use array form
            defval: "",
            blankrows: false,
            raw: false,  // Convert all data types to strings
            dateNF: 'yyyy-mm-dd'  // Format dates
          });
          
          // Skip empty sheets
          if (rawData.length === 0) {
            this.sheetHeaders.push([]);
            this.sheetData.push([]);
            this.sheetRowCounts.push(0);
            this.selectedHeaders.push("");
            continue;
          }
          
          // Enhanced header detection with machine learning-like approach
          const { headers, dataStartIndex } = this.detectHeadersIntelligently(rawData);
          
          // If no valid headers found
          if (headers.length === 0) {
            this.sheetHeaders.push([]);
            this.sheetData.push([]);
            this.sheetRowCounts.push(0);
            this.selectedHeaders.push("");
            continue;
          }
          
          // Filter only valid headers
          const validHeaders = headers.filter(h => this.isValidHeader(h));
          
          // Convert data to objects with the headers
          const sheetObjects = [];
          let rowCount = 0;
          
          for (let rowIndex = dataStartIndex; rowIndex < rawData.length; rowIndex++) {
            const row = rawData[rowIndex];
            
            // Skip empty rows
            if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === "")) {
              continue;
            }
            
            const rowObj = {};
            headers.forEach((header, idx) => {
              // Only use valid headers
              if (this.isValidHeader(header) && idx < row.length) {
                // Process the cell value
                let cellValue = row[idx];
                
                // Handle different cell types
                if (cellValue !== undefined && cellValue !== null) {
                  // Convert to string but preserve formatting for numbers
                  if (typeof cellValue === 'number') {
                    // Keep numbers as they are to preserve formatting
                    rowObj[header] = cellValue;
                  } else if (cellValue instanceof Date) {
                    // Format dates consistently
                    rowObj[header] = cellValue.toISOString().split('T')[0];
                  } else {
                    // Trim strings
                    rowObj[header] = String(cellValue).trim();
                  }
                } else {
                  rowObj[header] = "";
                }
              }
            });
            
            // Only add rows that have at least one non-empty value
            if (Object.values(rowObj).some(v => v !== undefined && v !== null && 
                (typeof v === 'number' || String(v).trim() !== ""))) {
              sheetObjects.push(rowObj);
              rowCount++;
            }
          }
          
          // Store sheet data and headers
          this.sheetHeaders.push(Array.from(new Set(validHeaders)).sort());
          this.sheetData.push(sheetObjects);
          this.sheetRowCounts.push(rowCount);
          this.selectedHeaders.push(""); // Initialize selection for each sheet
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        alert(`Error processing file ${file.name}: ${error.message}`);
      }
    },
    
    detectHeadersIntelligently(rawData) {
      // If less than 2 rows, the first row must be the header
      if (rawData.length < 2) {
        return { 
          headers: rawData[0].map(cell => cell !== undefined && cell !== null ? String(cell).trim() : `Column_${index}`),
          dataStartIndex: 1
        };
      }
      
      // We'll examine the first several rows to find the most likely header row
      const MAX_HEADER_ROWS = 10;
      const rowsToExamine = Math.min(MAX_HEADER_ROWS, rawData.length);
      
      // First, get non-empty rows
      const nonEmptyRows = [];
      for (let i = 0; i < rowsToExamine; i++) {
        const row = rawData[i];
        if (row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
          nonEmptyRows.push({ index: i, row: row });
        }
      }
      
      if (nonEmptyRows.length === 0) {
        return { headers: [], dataStartIndex: 0 };
      }
      
      // Score each potential header row
      const rowScores = nonEmptyRows.map(rowData => {
        const { index, row } = rowData;
        let score = 0;
        
        // 1. Headers often have text values (not numbers)
        const textCells = row.filter(cell => 
          cell !== undefined && cell !== null && 
          typeof cell !== 'number' && 
          !this.isDateString(String(cell))
        ).length;
        score += (textCells / row.length) * 10;
        
        // 2. Headers usually don't have empty cells
        const nonEmptyCells = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== "").length;
        score += (nonEmptyCells / row.length) * 5;
        
        // 3. Headers typically have more unique values
        const uniqueValues = new Set(row.map(cell => cell !== undefined && cell !== null ? String(cell) : "")).size;
        score += (uniqueValues / row.length) * 7;
        
        // 4. First row is often the header row (give it a bonus)
        if (index === 0) score += 3;
        
        // 5. Headers often have shorter cell lengths than data
        const avgCellLength = row.reduce((sum, cell) => {
          const cellStr = cell !== undefined && cell !== null ? String(cell) : "";
          return sum + cellStr.length;
        }, 0) / row.length;
        
        // Shorter average length is better for headers (but not too short)
        if (avgCellLength > 2 && avgCellLength < 20) {
          score += 4;
        }
        
        // 6. Common header names boost scores
        const commonHeaderTerms = ["id", "name", "date", "description", "price", "code", "category", "total", "address", "email", "phone"];
        const hasCommonHeaders = row.some(cell => {
          if (cell === undefined || cell === null) return false;
          const cellStr = String(cell).toLowerCase();
          return commonHeaderTerms.some(term => cellStr.includes(term));
        });
        
        if (hasCommonHeaders) score += 5;
        
        // Return with original index
        return { index, score };
      });
      
      // Sort by score descending
      rowScores.sort((a, b) => b.score - a.score);
      
      // Get the highest scoring row as our header
      const headerRowIndex = rowScores[0].index;
      
      // Process the header row to create clean header names
      const headerRow = rawData[headerRowIndex];
      const headers = headerRow.map((cell, index) => {
        // Process to create clean, unique headers
        if (cell === undefined || cell === null || String(cell).trim() === "") {
          return `Column_${index+1}`;
        }
        
        // Return clean header
        return String(cell).trim();
      });
      
      // If we need to combine with parent headers (for multi-level headers)
      if (headerRowIndex > 0) {
        // Check if we have potential parent headers
        const parentRows = [];
        for (let i = 0; i < headerRowIndex; i++) {
          const row = rawData[i];
          if (row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
            parentRows.push(row);
          }
        }
        
        // If we have parent rows, process them
        if (parentRows.length > 0) {
          const result = this.processMutiLevelHeaders([...parentRows, headerRow]);
          return { headers: result, dataStartIndex: headerRowIndex + 1 };
        }
      }
      
      return { headers, dataStartIndex: headerRowIndex + 1 };
    },
    
    isDateString(str) {
      // Check if a string is likely a date
      return /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(str) || // YYYY-MM-DD or MM/DD/YYYY
             /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(str);   // DD-MM-YYYY or MM/DD/YY
    },
    
    isValidHeader(header) {
      // Check if header is a valid string (not just a number or empty)
      if (!header) return false;
      
      // Convert to string and trim
      const headerStr = String(header).trim();
      
      // Empty headers are invalid
      if (headerStr === '') return false;
      
      // Headers that are only numbers or decimals are invalid (like 18.5 or 1.5)
      if (/^[\d\.]+$/.test(headerStr)) return false;
      
      // Headers should have at least one letter or special character
      return /[a-zA-Z]/.test(headerStr);
    },
    
    processMutiLevelHeaders(headerRows) {
      // If only one header row, return it directly
      if (headerRows.length === 1) {
        return headerRows[0];
      }
      
      // Initialize with the first row
      const result = [...headerRows[0]];
      
      // Track which columns have been processed
      const processedColumns = new Set();
      
      // Process each subsequent row
      for (let rowIndex = 1; rowIndex < headerRows.length; rowIndex++) {
        const currentRow = headerRows[rowIndex];
        
        for (let colIndex = 0; colIndex < currentRow.length; colIndex++) {
          const cellValue = currentRow[colIndex];
          
          // Skip empty cells or already processed columns
          if (!cellValue || processedColumns.has(colIndex)) continue;
          
          // Find the parent header (look upward)
          let parentHeader = "";
          for (let r = rowIndex - 1; r >= 0; r--) {
            if (headerRows[r][colIndex] && headerRows[r][colIndex] !== cellValue) {
              parentHeader = headerRows[r][colIndex];
              break;
            }
          }
          
          // If we found a parent header, combine them
          if (parentHeader) {
            result[colIndex] = `${parentHeader} - ${cellValue}`;
          } else if (!result[colIndex]) {
            // If no parent but this column doesn't have a header yet
            result[colIndex] = cellValue;
          }
          
          // Mark this column as processed
          processedColumns.add(colIndex);
        }
      }
      
      // Replace empty headers with a placeholder and ensure uniqueness
      return result.map((header, index) => header || `Column_${index+1}`);
    },
    
    async mergeSheets() {
      if (!this.allHeadersSelected) {
        alert("Please select a common header for each sheet.");
        return;
      }

      try {
        // Ensure all selected headers are valid and non-empty
        for (let i = 0; i < this.selectedHeaders.length; i++) {
          // Skip empty sheets
          if (this.sheetData[i].length === 0) continue;
          
          const header = this.selectedHeaders[i];
          if (!header || !this.isValidHeader(header)) {
            alert(`Invalid header selected for sheet "${this.sheetNames[i]}"`);
            return;
          }
        }
        
        // Create a normalized version of each sheet's data
        const normalizedDataFrames = [];
        
        for (let i = 0; i < this.sheetData.length; i++) {
          // Skip empty sheets
          if (this.sheetData[i].length === 0) continue;
          
          const selectedHeader = this.selectedHeaders[i];
          const currentSheetData = this.sheetData[i];
          
          if (!currentSheetData || !currentSheetData.length) {
            alert(`No valid data found in sheet "${this.sheetNames[i]}"`);
            return;
          }
          
          // Create a normalized version of the dataset
          const normalizedData = currentSheetData.map(row => {
            // Some sheets might not have the selected header in every row
            const mergeKeyValue = row[selectedHeader] !== undefined ? 
                                  String(row[selectedHeader]).trim() : "";
                                  
            // Create a new row with only valid headers
            const newRow = { 
              __mergeKey: mergeKeyValue 
            };
            
            // Add other columns with valid headers
            Object.keys(row).forEach(key => {
              if (this.isValidHeader(key)) {
                newRow[key] = row[key];
              }
            });
            
            return newRow;
          });
          
          // Filter out rows with empty merge keys
          const filteredData = normalizedData.filter(row => row.__mergeKey !== "");
          
          if (filteredData.length === 0) {
            alert(`No valid merge keys found in sheet "${this.sheetNames[i]}". All values in the selected column are empty.`);
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
        if (this.handleDuplicateKeys) {
          // Group by merge key to handle duplicates
          const mergeMap = new Map();
          
          normalizedDataFrames[0].forEach(row => {
            const key = row.__mergeKey;
            if (!key) return;
            
            if (mergeMap.has(key)) {
              // Duplicate key - merge properties
              const existingRow = mergeMap.get(key);
              Object.keys(row).forEach(prop => {
                if (prop !== '__mergeKey' && !existingRow[prop] && row[prop]) {
                  existingRow[prop] = row[prop];
                }
              });
            } else {
              mergeMap.set(key, { ...row });
            }
          });
          
          mergedData = Array.from(mergeMap.values());
        } else {
          // Just use the first dataset as is
          mergedData = [...normalizedDataFrames[0]];
        }
        
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

        // Create an ordered list of headers with "Common" as the first column
        const orderedHeaders = ['Common', ...Array.from(allMergedHeaders).sort()];
        
        // Normalize the merged data to ensure all rows have the same structure and use "Common" as the key
        const normalizedMergedData = mergedData.map(row => {
          const newRow = { 
            "Common": row.__mergeKey 
          };
          
          // Add all other valid headers
          orderedHeaders.forEach(header => {
            if (header !== 'Common') {
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
        
        const mergedWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(mergedWorkbook, worksheet, "Merged Data");
        const excelBuffer = XLSX.write(mergedWorkbook, { bookType: "xlsx", type: "array" });

        // Create a download link
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        this.downloadLink = URL.createObjectURL(blob);
      } catch (error) {
        console.error("Error merging sheets:", error);
        alert(`Error merging sheets: ${error.message}`);
      }
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
              // If handling duplicates, only overwrite if the value is empty
              if (this.handleDuplicateKeys) {
                if (!keyMap[key][prop] && row[prop]) {
                  keyMap[key][prop] = row[prop];
                }
              } else {
                // Otherwise, always take the latest value
                keyMap[key][prop] = row[prop];
              }
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
  --info-color: #3498db;
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

.file-list h3, .file-list h4 {
  font-size: 16px;
  margin-bottom: 10px;
  color: var(--dark-color);
}

.file-list h4 {
  font-size: 14px;
  margin-top: 15px;
}

.file-list ul {
  list-style: none;
}

.file-list li, .uploaded-file {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.file-list li:last-child {
  border-bottom: none;
}

.file-list i, .uploaded-file i {
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