// src/utils/errorMessages.js

const errorMessages = {
  network: "Network error: Please check your internet connection.",
  unexpected: "An unexpected error occurred. Please try again later.",
  loginFailed: "Login failed: Invalid username or password.",
  noPermission: "You do not have permission to perform this action.",
  requiredFields: "Please fill in all required fields.",
  invalidField: (field) => `Invalid value: ${field}.`,
  duplicate: (type) => `Duplicate entry: This ${type} number already exists for the selected year.`,
  saveFailed: "Unable to save record. Please try again.",
  importFormat: "Import failed: Unsupported file format. Please use Excel (.xlsx) or CSV.",
  importMissingColumns: "Import failed: Missing required columns.",
  importPartial: "Some records could not be imported due to errors.",
  notFound: "Record not found.",
  updateFailed: "Unable to update record.",
  deleteFailed: "Unable to delete record.",
  yearRequired: "You must select a financial year to continue.",
  adminOnly: "Only admins can perform this operation.",
};

export default errorMessages;
