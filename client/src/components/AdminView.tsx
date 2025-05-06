import { useContext, useState } from "react";

// components
import { ConfirmationModal, PageFooter } from "@/components";

// utils
import { backendAPI } from "@/utils/backendAPI";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { SET_POLL } from "@/context/types";

interface PollFormInputs {
  question: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  answer5: string;
  displayMode: "percentage" | "count";
}

/*
  The AdminView component is where admins can set the poll question, options, and display mode
  (or reset the poll). It is displayed upon clicking the settings icon in the header.
*/
export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState<PollFormInputs>({
    question: "",
    answer1: "",
    answer2: "",
    answer3: "",
    answer4: "",
    answer5: "",
    displayMode: "percentage",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalType, setModalType] = useState<"save" | "reset" | null>(null);

  function handleToggleShowConfirmationModal() {
    setShowConfirmationModal(!showConfirmationModal);
    if (showConfirmationModal) {
      setPendingAction(null); // Reset pending action when modal is closed
    }
  }

  // Updates the formData field matching the input/select’s name with its new value
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  // This function will be called when the user clicks the "Save" button
  const handleSubmitPoll = async () => {
    setErrorMessage("");

    // Validate that the question is not empty
    if (formData.question.trim() === "") {
      setErrorMessage("Poll question is required.");
      return;
    }

    // Create an array of poll options from the formData
    const options = [formData.answer1, formData.answer2, formData.answer3, formData.answer4, formData.answer5];

    // Filter out any options that are empty or only whitespace
    const validOptions = options.filter((option) => option.trim() !== "");

    // Error if less than 2 options are provided
    if (validOptions.length < 2) {
      setErrorMessage("At least two options are required.");
      return;
    }

    // If validation is successful, proceed with the API call
    setIsSubmitting(true);

    // Overrides the poll with a backend PUT request
    backendAPI
      .put("/poll", formData)
      .then((res) => {
        console.log("Poll updated successfully");
        const poll = res.data.poll;
        dispatch!({
          type: SET_POLL,
          payload: { poll },
        });
      })
      .catch((error) => setErrorMessage(error?.response?.data?.message || error.message || "Error updating poll"))
      .finally(() => setIsSubmitting(false));
  };

  // Resets the data object for the dropped Asset (including the current poll) using backend POST
  const handleResetPoll = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    backendAPI
      .post("admin/reset")
      .then(() => {
        console.log("Poll reset successfully");
      })
      .catch((error) => setErrorMessage(error?.response?.data?.message || error.message || "Error resetting poll"))
      .finally(() => setIsSubmitting(false));
  };

  // Get the confirmation modal for the Save button
  const handleSaveClick = () => {
    setPendingAction(() => handleSubmitPoll);
    setModalType("save"); // using new generic modal
    setShowConfirmationModal(true);
  };

  // Get the confirmation modal for the Reset button
  const handleResetClick = () => {
    setPendingAction(() => handleResetPoll);
    setModalType("reset"); // using the same new generic modal
    setShowConfirmationModal(true);
  };

  return (
    // Extra padding at the bottom (pb-16) so the footer does not block scrollable content.
    <div className="relative max-h-[80vh] overflow-y-auto pb-16">
      {/* Center the container and slightly shrink option boxes / add padding */}
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 grid gap-4">
        <div className="container grid gap-4">
          {/* Sticky header for user context while filling out the poll form*/}
          <div className="sticky top-0 bg-white z-10 pt-4 pb-5 mb-4">
            <h2 className="h3">Create or Update Poll</h2>
          </div>

          {errorMessage && <div className="p-4 bg-red-100 text-red-600 rounded">{errorMessage}</div>}

          {/* Poll Question formatting*/}
          <h2>Poll Question</h2>
          <input className="input" name="question" value={formData.question} onChange={handleChange} maxLength={150} />

          {/* Poll Options formatting*/}
          {["answer1", "answer2", "answer3", "answer4", "answer5"].map((field, index) => (
            <div key={index}>
              <h2>Option {index + 1}</h2>
              <input
                className="input"
                name={field}
                value={formData[field as keyof PollFormInputs]}
                onChange={handleChange}
                maxLength={16}
              />
              {/* <p className="text-sm text-gray-500">{formData[field as keyof PollFormInputs].length}/40</p> */}
            </div>
          ))}

          {/* How to Display results formatting */}
          <div className="mb-2"></div>
          <h2>Results Display</h2>
          {/* Using flex and gap to separate the radio buttons */}
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                name="displayMode"
                value="percentage"
                checked={formData.displayMode === "percentage"}
                onChange={handleChange}
                className="mr-1"
              />
              Percentage
            </label>
            <label>
              <input
                type="radio"
                name="displayMode"
                value="count"
                checked={formData.displayMode === "count"}
                onChange={handleChange}
                className="mr-1"
              />
              Number of Votes
            </label>
          </div>

          {/* Buffering section below the input form options */}
          <div className="mb-8"></div>
        </div>
      </div>

      {/* Save and Reset buttons formatting */}
      <PageFooter>
        <button className="btn btn-primary mb-2" onClick={handleSaveClick} disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Save"}
        </button>
        <button className="btn btn-danger" onClick={handleResetClick} disabled={isSubmitting}>
          Reset
        </button>
      </PageFooter>

      {errorMessage && <p className="p3 text-error">{errorMessage}</p>}

      {/* Confirmation modal for Save and Reset buttons */}
      {showConfirmationModal && (
        <ConfirmationModal
          title={modalType === "save" ? "Override Poll?" : "Reset Poll?"}
          message={
            modalType === "save"
              ? "Current poll data and results will be erased."
              : "Current poll data and results will be erased."
          }
          handleToggleShowConfirmationModal={handleToggleShowConfirmationModal}
          onConfirm={() => {
            if (pendingAction) pendingAction();
            handleToggleShowConfirmationModal();
          }}
        />
      )}
    </div>
  );
};

export default AdminView;
