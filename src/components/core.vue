<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Excel File Merger</h1>
      <div class="user-info">
        <div class="user-info-item">
          <i class="fas fa-clock"></i>
          <span>{{ currentDateTime }}</span>
        </div>
        <div class="user-info-item">
          <i class="fas fa-user"></i>
          <span>{{ currentUser }}</span>
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
            <input type="file" id="files" multiple ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls,.csv"
              class="file-upload-input" />
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
      currentDateTime: "2025-06-06 09:54:03",
      currentUser: "rifat0rahman"
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

      this.fileHeaders = [];
      this.selectedHeaders = [];
      this.fileNames = [];
      this.fileData = [];
      this.downloadLink = null;

      for (let file of files) {
        const fileBuffer = await file.arrayBuffer();
        this.fileNames.push(file.name);

        try {
          // Read the file with SheetJS
          const workbook = XLSX.read(fileBuffer, { type: "array" });
          const allFileData = [];
          const allHeaders = new Set();

          // Process each sheet in the workbook
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];

            // Skip empty sheets
            if (!sheet['!ref']) continue;

            // Get the raw data as arrays
            const rawData = XLSX.utils.sheet_to_json(sheet, {
              header: 1,  // Use array form
              defval: "",
              blankrows: false
            });

            // Skip empty sheets
            if (rawData.length === 0) continue;

            // Find potential header rows (looking at first several rows)
            const MAX_HEADER_ROWS = 5; // Look at up to 5 rows for headers
            const headerRows = [];

            // Find rows that might be headers (non-empty rows at the beginning)
            for (let i = 0; i < Math.min(MAX_HEADER_ROWS, rawData.length); i++) {
              const row = rawData[i];
              if (row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
                headerRows.push(row.map(cell => cell !== undefined && cell !== null ? String(cell).trim() : ""));
              }
            }

            if (headerRows.length === 0) continue; // No valid headers found

            // Process multi-level headers
            let flattenedHeaders = this.processMutiLevelHeaders(headerRows);

            // Find the index after the last header row
            const dataStartIndex = headerRows.length;

            // Add all valid flattened headers to our set
            flattenedHeaders.forEach(h => {
              if (this.isValidHeader(h)) allHeaders.add(h);
            });

            // Convert data to objects with the flattened headers
            for (let rowIndex = dataStartIndex; rowIndex < rawData.length; rowIndex++) {
              const row = rawData[rowIndex];

              // Skip empty rows
              if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === "")) {
                continue;
              }

              const rowObj = {};
              flattenedHeaders.forEach((header, idx) => {
                // Only use valid headers
                if (this.isValidHeader(header) && idx < row.length) {
                  rowObj[header] = row[idx];
                }
              });

              // Only add rows that have at least one non-empty value
              if (Object.values(rowObj).some(v => v !== undefined && v !== null && String(v).trim() !== "")) {
                allFileData.push(rowObj);
              }
            }
          }

          // Store all unique headers and data for this file
          this.fileHeaders.push([...allHeaders].sort());
          this.selectedHeaders.push(""); // Initialize selection for each file
          this.fileData.push(allFileData);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          alert(`Error processing file ${file.name}: ${error.message}`);
        }
      }
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
      return result.map((header, index) => header || `Column_${index}`);
    },

    async mergeFiles() {
      if (!this.allHeadersSelected) {
        alert("Please select a common header for each file.");
        return;
      }

      try {
        // Ensure all selected headers are valid and non-empty
        for (let i = 0; i < this.selectedHeaders.length; i++) {
          const header = this.selectedHeaders[i];
          if (!header || !this.isValidHeader(header)) {
            alert(`Invalid header selected for file ${this.fileNames[i]}`);
            return;
          }
        }

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
            // Some files might not have the selected header in every row
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
        let mergedData = normalizedDataFrames[0];
        for (let i = 1; i < normalizedDataFrames.length; i++) {
          const currentData = normalizedDataFrames[i];
          mergedData = this.mergeByCommonColumn(mergedData, currentData);
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
        console.error("Error merging files:", error);
        alert(`Error merging files: ${error.message}`);
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