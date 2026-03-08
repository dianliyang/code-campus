import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ImportForm from "@/components/import/ImportForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const dict = {
  label: "Import",
  title_main: "Ingest",
  title_sub: "Data_Package",
  form_uni: "University",
  form_code: "Code",
  form_title: "Title",
  form_url: "URL",
  form_level: "Level",
  level_undergraduate: "Undergraduate",
  level_graduate: "Graduate",
  form_internal: "Visibility",
  internal_public: "Public",
  internal_private: "Internal",
  form_desc: "Description",
  form_dept: "Department",
  form_units: "Units",
  form_uni_placeholder: "",
  form_code_placeholder: "",
  form_title_placeholder: "",
  form_dept_placeholder: "",
  form_units_placeholder: "",
  form_desc_placeholder: "",
  submit_btn: "Submit",
  submit_loading: "Submitting",
  bulk_title: "Bulk",
  bulk_desc: "Bulk desc",
  bulk_drop: "Drop",
  bulk_or: "or",
  msg_success: "ok",
  msg_error_network: "err",
  msg_bulk_success: "ok",
  protocol_title: "Protocol",
  protocol_requirements: "Requirements",
  protocol_json_blueprint: "JSON",
  protocol_csv_headers: "CSV",
  req_required: "Required",
  req_optional: "Optional",
  note_uni: "u",
  note_code: "c",
  note_title: "t",
  note_internal: "i",
  note_desc: "d",
  note_url: "url",
  note_dept: "dept",
  note_units: "units",
};

describe("ImportForm", () => {
  test("does not repeat the Import heading inside the form and uses field labels for manual inputs", () => {
    render(<ImportForm dict={dict} />);

    expect(screen.queryByRole("heading", { name: "Import" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Ingest" })).toBeNull();
    expect(screen.getByText("University").getAttribute("data-slot")).toBe("field-label");
    expect(screen.getByText("Code").getAttribute("data-slot")).toBe("field-label");
    expect(screen.getByText("Title").getAttribute("data-slot")).toBe("field-label");
  });
});
