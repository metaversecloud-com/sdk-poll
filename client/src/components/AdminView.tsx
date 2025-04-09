import { useState } from "react";
import { PageFooter, ConfirmationModal } from "@/components";
import { backendAPI } from "@/utils/backendAPI";

interface PollFormInputs {
  question: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  answer5: string;
  displayMode: 'percentage' | 'count';
}

export const AdminView = () => {
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
  const [modalType, setModalType] = useState<'save' | 'reset' | null>(null);

  function handleToggleShowConfirmationModal() {
    setShowConfirmationModal(!showConfirmationModal);
    if (showConfirmationModal) {
      setPendingAction(null); // Reset pending action when modal is closed
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  // This function will be called when the user clicks the "Save" button
  const handleSubmitPoll = async (e: React.FormEvent) => {
    setErrorMessage("");

    // Validate that the question is not empty
    if (formData.question.trim() === "") {
      setErrorMessage("Poll question is required.");
      return;
    }

    // Create an array of poll options from the formData
    const options = [
      formData.answer1,
      formData.answer2,
      formData.answer3,
      formData.answer4,
      formData.answer5,
    ];
    
    // Filter out any options that are empty or only whitespace
    const validOptions = options.filter((option) => option.trim() !== "");
    
    if (validOptions.length < 2) {
      setErrorMessage("At least two options are required.");
      return;
    }

    // If validation is successful, proceed with the API call
    setIsSubmitting(true);

    backendAPI
      .put("/updatePoll", formData)
      .then(() => {
        console.log("Poll updated successfully");
      })
      .catch((error) =>
        setErrorMessage(
          error?.response?.data?.message || error.message || "Error updating poll"
        )
      )
      .finally(() => setIsSubmitting(false));
  };

  const handleResetPoll = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    backendAPI
      .post("admin/reset")
      .then(() => {
        console.log("Poll reset successfully");
      })
      .catch((error) =>
        setErrorMessage(
          error?.response?.data?.message || error.message || "Error resetting poll"
        )
      )
      .finally(() => setIsSubmitting(false));
  }

  // Get the confirmation modal for the Save button as well
  const handleSaveClick = () => {
    setPendingAction(() => handleSubmitPoll);
    setModalType('save'); // using new generic modal
    setShowConfirmationModal(true);
  };

  const handleResetClick = () => {
    setPendingAction(() => handleResetPoll);
    setModalType('reset'); // using new generic modal
    setShowConfirmationModal(true);
  };


  return (
    // The container now has extra padding at the bottom (pb-16) so the footer does not block scrollable content.
    <div className="relative max-h-[80vh] overflow-y-auto pb-16">
      <div className="container grid gap-4">
        <h2 className="h3">Create or Update Poll</h2>

        {errorMessage && (
          <div className="p-4 bg-red-100 text-red-600 rounded">
            {errorMessage}
          </div>
        )}
        
        <label>Poll Question</label>
        <input 
          className="input" 
          name="question" 
          value={formData.question} 
          onChange={handleChange} 
        />
        
        {["answer1", "answer2", "answer3", "answer4", "answer5"].map((field, index) => (
          <div key={index}>
            <label>Option {index + 1}</label>
            <input 
              className="input" 
              name={field} 
              value={formData[field as keyof PollFormInputs]} 
              onChange={handleChange} 
            />
          </div>
        ))}

        <label>Results Display</label>
        {/* Using flex and gap to separate the radio buttons */}
        <div className="flex gap-4">
          <label>
            <input 
              type="radio" 
              name="displayMode" 
              value="percentage" 
              checked={formData.displayMode === "percentage"} 
              onChange={handleChange} 
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
            />
            Number of Votes
          </label>
        </div>

        {/* Buffering section below the input form options */}
        <div className="mb-8"></div>
      </div>
      
      <PageFooter>
        <button 
          className="btn btn-primary" 
          onClick={handleSaveClick} 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Save"}
        </button>
        <button 
          className="btn btn-danger" 
          onClick={handleResetClick}
          disabled={isSubmitting}
        >
          Reset
        </button>
      </PageFooter>
      
      {errorMessage && <p className="p3 text-error">{errorMessage}</p>}
      
      {showConfirmationModal && (
        <ConfirmationModal
          title={
            modalType === 'save'
              ? "Override Poll?"
              : "Reset Poll?"
          }
          message={
            modalType === 'save'
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
