document.getElementById('extractButton').addEventListener('click', async () => {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Inject and execute the content script
  try {
    const [results] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractTableData,
    });

    if (results.result) {
      const {csvContent, filename} = results.result;
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
    }
  } catch (err) {
    console.error('Failed to extract table:', err);
    alert('Failed to extract table. Make sure you are on a BLS.gov page with a data table.');
  }
});

function extractTableData() {
  // Get table ID from URL
  const urlPath = window.location.pathname;
  const tableIdExtension = urlPath.split('/').pop();
  const tableId = tableIdExtension.replace('.htm', '');
  console.log('Looking for table with ID:', tableId);
  
  // Try different methods to find the table
  let table = document.getElementById(tableId);
  
  // If direct ID lookup fails, try finding the first table on the page
  if (!table) {
    console.log('Table not found by ID, looking for any data table');
    table = document.querySelector('table.regular');  // BLS often uses 'regular' class for data tables
    
    if (!table) {
      table = document.querySelector('table');  // Fall back to first table on page
    }
  }

  if (!table) {
    throw new Error('No suitable table found on the page');
  }

  // Extract headers
  const headers = [];
  const headerRows = table.querySelectorAll('thead tr');
  headerRows.forEach(row => {
    const cells = row.querySelectorAll('th');
    cells.forEach(cell => headers.push(cell.textContent.trim()));
  });

  // Extract data rows
  const rows = [];
  const dataRows = table.querySelectorAll('tbody tr');
  dataRows.forEach(row => {
    const rowData = [];
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => rowData.push(cell.textContent.trim()));
    rows.push(rowData);
  });

  // Convert to CSV
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];
  const csvContent = csvRows.join('\n');

  // Generate filename from page title or table ID
  const filename = `${tableId.replace('.htm', '')}_data.csv`;

  return {
    csvContent,
    filename
  };
} 