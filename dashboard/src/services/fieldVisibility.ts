/**
 * Field Visibility Service
 *
 * Filter template fields based on user context (admin, merchant, customer)
 */

import type { TemplateField, VisibilityContext } from "@/types";

/**
 * Filter template fields based on user context
 */
export function filterFieldsByVisibility(
  fields: TemplateField[],
  context: VisibilityContext
): TemplateField[] {
  return fields.filter((field) => {
    switch (context) {
      case "admin":
        return field.isVisibleToAdmin !== false; // Default true
      case "merchant":
        return field.isVisibleToMerchant === true;
      case "customer":
        return field.isVisibleToCustomer === true;
      default:
        return false;
    }
  });
}

/**
 * Get visible fields for a user based on their role
 */
export function getVisibleFields(
  template: { fieldsSchema: TemplateField[] },
  userRole: VisibilityContext
): TemplateField[] {
  const sortedFields = template.fieldsSchema.sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );
  return filterFieldsByVisibility(sortedFields, userRole);
}

/**
 * Check if a field is visible to a specific user role
 */
export function isFieldVisible(
  field: TemplateField,
  context: VisibilityContext
): boolean {
  switch (context) {
    case "admin":
      return field.isVisibleToAdmin !== false;
    case "merchant":
      return field.isVisibleToMerchant === true;
    case "customer":
      return field.isVisibleToCustomer === true;
    default:
      return false;
  }
}

/**
 * Get field visibility as a bitmask for efficient storage
 */
export function getVisibilityBitmask(field: TemplateField): number {
  let mask = 0;
  if (field.isVisibleToAdmin !== false) mask |= 1 << 0; // Bit 0: Admin
  if (field.isVisibleToMerchant) mask |= 1 << 1; // Bit 1: Merchant
  if (field.isVisibleToCustomer) mask |= 1 << 2; // Bit 2: Customer
  return mask;
}
