const API_VERSION = '2.0.0';
const SCHEMA_VERSION = 1;

const TOKEN = 'replace-with-shared-token';

const PRIMARY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/PRIMARY_SHEET_ID/edit';
const FALLBACK_SHEET_URL = 'https://docs.google.com/spreadsheets/d/FALLBACK_SHEET_ID/edit';

const FETCH_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  SHEET_NOT_FOUND: 'SHEET_NOT_FOUND',
  SCHEMA_MISMATCH: 'SCHEMA_MISMATCH',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

const EXPECTED_HEADERS = ['id', 'date', 'text', 'created_at', 'updated_at'];

function doGet(e) {
  if (!e || !e.parameter) {
    return jsonOutput({
      success: false,
      data: [],
      meta: responseMeta('primary'),
      errorCode: FETCH_ERROR_CODES.INTERNAL_ERROR,
      message: 'Missing parameters'
    });
  }

  if (e.parameter.action !== 'fetch') {
    return jsonOutput({
      success: false,
      data: [],
      meta: responseMeta('primary'),
      errorCode: FETCH_ERROR_CODES.INTERNAL_ERROR,
      message: 'Unsupported action'
    });
  }

  if (!isAuthorized(e.parameter.token)) {
    return jsonOutput({
      success: false,
      data: [],
      meta: responseMeta('primary'),
      errorCode: FETCH_ERROR_CODES.UNAUTHORIZED,
      message: 'Unauthorized'
    });
  }

  try {
    const primaryRows = readSheetRows(PRIMARY_SHEET_URL);
    return jsonOutput({
      success: true,
      data: primaryRows,
      meta: responseMeta('primary')
    });
  } catch (error) {
    const primaryCode = classifyFetchError(error);

    if (!shouldAttemptFallback(primaryCode)) {
      return jsonOutput({
        success: false,
        data: [],
        meta: responseMeta('primary'),
        errorCode: primaryCode,
        message: String(error)
      });
    }

    try {
      const fallbackRows = readSheetRows(FALLBACK_SHEET_URL);
      return jsonOutput({
        success: true,
        data: fallbackRows,
        meta: responseMeta('fallback')
      });
    } catch (fallbackError) {
      return jsonOutput({
        success: false,
        data: [],
        meta: responseMeta('fallback'),
        errorCode: classifyFetchError(fallbackError),
        message: String(fallbackError)
      });
    }
  }
}

function responseMeta(source) {
  return {
    apiVersion: API_VERSION,
    schemaVersion: SCHEMA_VERSION,
    source: source,
    fetchedAt: new Date().toISOString()
  };
}

function isAuthorized(token) {
  return TOKEN && token === TOKEN;
}

function shouldAttemptFallback(errorCode) {
  return errorCode === FETCH_ERROR_CODES.SCHEMA_MISMATCH
    || errorCode === FETCH_ERROR_CODES.SHEET_NOT_FOUND;
}

function classifyFetchError(error) {
  const text = String(error || '');

  if (text.indexOf('Sheet not found') >= 0 || text.indexOf('Cannot find') >= 0) {
    return FETCH_ERROR_CODES.SHEET_NOT_FOUND;
  }

  if (text.indexOf('SCHEMA_MISMATCH') >= 0) {
    return FETCH_ERROR_CODES.SCHEMA_MISMATCH;
  }

  return FETCH_ERROR_CODES.INTERNAL_ERROR;
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetRows(sheetId) {
  const normalizedId = normalizeSheetId(sheetId);
  const sheet = SpreadsheetApp.openById(normalizedId).getActiveSheet();

  if (sheet.getLastRow() < 1) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function (value) {
    return String(value).trim().toLowerCase();
  });

  validateHeaders(headers);

  const rows = values.slice(1).map(function (row) {
    return mapRow(headers, row);
  }).filter(function (item) {
    return item.id && item.date && item.text;
  });

  rows.sort(function (a, b) {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return rows;
}

function normalizeSheetId(value) {
  if (value === null || value === undefined) {
    throw new Error('Invalid argument: id (missing value)');
  }

  const raw = String(value).trim();
  if (!raw) {
    throw new Error('Invalid argument: id (empty value)');
  }

  if (raw.indexOf('docs.google.com/spreadsheets/d/') >= 0) {
    const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      throw new Error('Invalid argument: id (could not parse from URL)');
    }

    return match[1];
  }

  return raw;
}

function validateHeaders(headers) {
  for (var i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (headers.indexOf(EXPECTED_HEADERS[i]) === -1) {
      throw new Error('SCHEMA_MISMATCH: missing column ' + EXPECTED_HEADERS[i]);
    }
  }
}

function mapRow(headers, row) {
  var rowObj = {};
  for (var i = 0; i < headers.length; i++) {
    rowObj[headers[i]] = row[i];
  }

  return {
    id: String(rowObj.id || '').trim(),
    date: String(rowObj.date || '').trim(),
    text: String(rowObj.text || '').trim(),
    createdAt: String(rowObj.created_at || '').trim(),
    updatedAt: String(rowObj.updated_at || '').trim()
  };
}

function migrateLegacyToV1(sourceSheetId, targetSheetId) {
  var sourceId = normalizeSheetId(sourceSheetId);
  var targetId = normalizeSheetId(targetSheetId);
  var sourceSheet = SpreadsheetApp.openById(sourceId).getActiveSheet();
  var targetSheet = SpreadsheetApp.openById(targetId).getActiveSheet();

  var sourceValues = sourceSheet.getDataRange().getValues();
  var now = new Date().toISOString();

  targetSheet.clearContents();
  targetSheet.appendRow(EXPECTED_HEADERS);

  for (var i = 1; i < sourceValues.length; i++) {
    var date = String(sourceValues[i][0] || '').trim();
    var text = String(sourceValues[i][1] || '').trim();

    if (!date || !text) {
      continue;
    }

    targetSheet.appendRow([
      Utilities.getUuid(),
      date,
      text,
      now,
      now
    ]);
  }
}
