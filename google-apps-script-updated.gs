// Updated Google Apps Script code for handling edit/delete operations
// This should replace or extend your existing Google Apps Script

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  try {
    let result;
    
    if (action === 'fetch') {
      result = getQuotes();
    } else if (action === 'edit') {
      result = editQuote(e.parameter);
    } else if (action === 'delete') {
      result = deleteQuote(e.parameter);
    } else {
      // Default action: add new quote
      result = addQuote(e.parameter);
    }
    
    // Handle JSONP callback for fetching quotes
    if (callback && action === 'fetch') {
      const jsonpResponse = callback + '(' + JSON.stringify(result) + ');';
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // Return JSON for other operations
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    
    const errorResult = {
      success: false,
      error: error.toString()
    };
    
    if (callback && action === 'fetch') {
      const jsonpResponse = callback + '(' + JSON.stringify(errorResult) + ');';
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addQuote(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 2).setValues([['Date', 'Quote']]);
    }
    
    const date = params.date;
    const quote = params.quote;
    
    if (!date || !quote) {
      throw new Error('Date and quote are required');
    }
    
    // Add new row
    sheet.appendRow([date, quote]);
    
    Logger.log('Quote added successfully: ' + quote);
    return { success: true, message: 'Quote added successfully' };
    
  } catch (error) {
    Logger.log('Error adding quote: ' + error.toString());
    throw error;
  }
}

function editQuote(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const index = parseInt(params.index);
    const newDate = params.date;
    const newQuote = params.quote;
    
    if (isNaN(index) || !newDate || !newQuote) {
      throw new Error('Index, date and quote are required for editing');
    }
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    
    // Skip header row, so actual data starts at index 1
    const actualRowIndex = index + 2; // +1 for header, +1 for 1-based indexing
    
    if (actualRowIndex > data.length) {
      throw new Error('Quote index out of range');
    }
    
    // Update the specific row
    sheet.getRange(actualRowIndex, 1, 1, 2).setValues([[newDate, newQuote]]);
    
    Logger.log('Quote edited successfully at index: ' + index);
    return { 
      success: true, 
      message: 'Quote edited successfully',
      index: index
    };
    
  } catch (error) {
    Logger.log('Error editing quote: ' + error.toString());
    throw error;
  }
}

function deleteQuote(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const index = parseInt(params.index);
    
    if (isNaN(index)) {
      throw new Error('Index is required for deletion');
    }
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    
    // Skip header row, so actual data starts at index 1
    const actualRowIndex = index + 2; // +1 for header, +1 for 1-based indexing
    
    if (actualRowIndex > data.length) {
      throw new Error('Quote index out of range');
    }
    
    // Delete the specific row
    sheet.deleteRow(actualRowIndex);
    
    Logger.log('Quote deleted successfully at index: ' + index);
    return { 
      success: true, 
      message: 'Quote deleted successfully',
      index: index
    };
    
  } catch (error) {
    Logger.log('Error deleting quote: ' + error.toString());
    throw error;
  }
}

function getQuotes() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Skip header row and convert to objects
    const quotes = data.slice(1).map(row => ({
      date: row[0],
      text: row[1]
    }));
    
    // Sort by date descending (newest first)
    quotes.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    Logger.log('Retrieved ' + quotes.length + ' quotes');
    return quotes;
    
  } catch (error) {
    Logger.log('Error getting quotes: ' + error.toString());
    throw error;
  }
}

// Test functions for development
function testAddQuote() {
  const result = addQuote({
    date: '2023-12-10',
    quote: 'Test quote from script'
  });
  Logger.log(result);
}

function testEditQuote() {
  const result = editQuote({
    index: '0',
    date: '2023-12-10',
    quote: 'Edited test quote'
  });
  Logger.log(result);
}

function testDeleteQuote() {
  const result = deleteQuote({
    index: '0'
  });
  Logger.log(result);
}

function testGetQuotes() {
  const result = getQuotes();
  Logger.log(result);
}