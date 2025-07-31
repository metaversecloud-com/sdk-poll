import { useContext, useState, useEffect } from "react";

// components
import { ConfirmationModal, PageFooter } from "@/components";

// utils
import { backendAPI } from "@/utils/backendAPI";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { SET_POLL } from "@/context/types";

/*
  The AdminView component is where admins can set the poll question, options, and display mode
  (or reset the poll). It is displayed upon clicking the settings icon in the header.
*/
export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext)!;
  const { poll } = useContext(GlobalStateContext);

  const pollOptionMaxTextLength = 100;
  const pollQuestionMaxTextLength = 150;
  const maxOptions = 10;

  // state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [displayMode, setDisplayMode] = useState<"percentage" | "count">("percentage");

  const [origQuestion, setOrigQuestion] = useState("");
  const [origOptions, setOrigOptions] = useState<string[]>([]);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalType, setModalType] = useState<"crucialSave" | "reset" | "nonCrucialSave" | null>("nonCrucialSave");

  const handleToggleShowConfirmationModal = () => {
    setShowConfirmationModal((v) => !v);
    if (showConfirmationModal) setPendingAction(null);
  };

  useEffect(() => {
    if (!poll) return;
    // pull the question + the answers array
    const { question, answers, displayMode } = poll;

    setQuestion(question);
    setOptions(answers.length > 0 ? poll.answers : ["", ""]);
    setDisplayMode(displayMode === "count" ? "count" : "percentage");

    setOrigQuestion(poll.question);
    setOrigOptions(poll.answers);

    setModalType("nonCrucialSave");
  }, [poll]);

  const validOptions = options.filter((o) => o.trim() !== "");
  const isValid = question.trim() !== "" && validOptions.length >= 2;

  // handlers
  const addOption = () => {
    if (options.length < maxOptions) {
      setOptions((prev) => [...prev, ""]);
    }
  };

  // detect edits for modal type changes
  useEffect(() => {
    const trimmedOpts = options.map((o) => o.trim());
    const trimmedOrig = origOptions.map((o) => o.trim());

    const questionChanged = question.trim() !== origQuestion.trim();
    const optionsChanged =
      trimmedOpts.length !== trimmedOrig.length || trimmedOpts.some((o, i) => o !== trimmedOrig[i]);

    if (questionChanged || optionsChanged) {
      setModalType("crucialSave");
    } else {
      setModalType("nonCrucialSave");
    }
  }, [question, options, origQuestion, origOptions]);

  // This function will be called when the user clicks the yes in the modal
  const handleSubmitPoll = async () => {
    setIsSubmitting(true);
    try {
      const payload =
        modalType === "crucialSave"
          ? { question, answers: options, displayMode, crucial: true }
          : { displayMode, crucial: false };
      const res = await backendAPI.put("/poll", payload);
      dispatch({
        type: SET_POLL,
        payload: { poll: res.data.poll },
      });
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || "Error updating poll");
    } finally {
      setIsSubmitting(false);
      handleToggleShowConfirmationModal();
    }
  };

  // Resets the data object for the dropped Asset (including the current poll) using backend POST
  const handleResetPoll = async () => {
    setIsSubmitting(true);
    try {
      await backendAPI.post("admin/reset");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || "Error resetting poll");
    } finally {
      setIsSubmitting(false);
      handleToggleShowConfirmationModal();
    }
  };

  // Get the confirmation modal for the Save button
  const handleSaveClick = () => {
    setErrorMessage("");
    if (!isValid) {
      setErrorMessage("Question is required and at least two options must be non‑empty.");
      return;
    }
    setPendingAction(() => handleSubmitPoll);
    handleToggleShowConfirmationModal();
  };

  // Get the confirmation modal for the Reset button
  const handleResetClick = () => {
    setPendingAction(() => handleResetPoll);
    setModalType("reset");
    handleToggleShowConfirmationModal();
  };

  const getModalTitle = () => {
    switch (modalType) {
      case "crucialSave":
        return `Override poll?`;
      case "nonCrucialSave":
        return `Update poll?`;
      case "reset":
        return `Reset poll?`;
    }
    return `Override poll?`;
  };

  const getModalMessage = () => {
    if (modalType === "nonCrucialSave") return "No data will be lost.";
    return "Current poll data and results will be erased.";
  };

  return (
    <div className="grid grid-flow-row gap-4 pb-20">
      <h3>Create or Update Poll</h3>

      {errorMessage && <p className="p3 py-4 text-center text-error">{errorMessage}</p>}

      <div className="input-group">
        <label className="label">Poll Question</label>
        <input
          id="titleInput"
          className="input"
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={pollQuestionMaxTextLength}
        />
        <span className="input-char-count">
          {question.length}/{pollQuestionMaxTextLength}
        </span>
      </div>

      {/* poll options */}
      <div className="space-y-3 mb-4">
        {options.map((opt, i) => (
          <div key={i} className="input-group">
            <label className="label">Option {i + 1}</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="input flex-grow"
                value={opt}
                onChange={(e) => {
                  const copy = [...options];
                  copy[i] = e.target.value;
                  setOptions(copy);
                }}
                maxLength={pollOptionMaxTextLength}
                placeholder={`Option ${i + 1}`}
              />
            </div>
            <span className="input-char-count">
              {opt.length}/{pollOptionMaxTextLength}
            </span>
          </div>
        ))}
      </div>

      {/* add poll option */}
      {options.length < maxOptions && (
        <div className="mb-4 flex justify-center">
          <button type="button" className="btn btn-icon" onClick={addOption}>
            <img src="https://sdk-style.s3.amazonaws.com/icons/plus.svg" />
          </button>
        </div>
      )}

      <h4 className="pt-4">Results Display</h4>
      <div className="flex gap-4 pb-8">
        <label>
          <input
            type="radio"
            name="displayMode"
            value="percentage"
            checked={displayMode === "percentage"}
            onChange={() => setDisplayMode("percentage")}
            className="mr-1"
          />
          Percentage
        </label>
        <label>
          <input
            type="radio"
            name="displayMode"
            value="count"
            checked={displayMode === "count"}
            onChange={() => setDisplayMode("count")}
            className="mr-1"
          />
          Number of Votes
        </label>
      </div>

      {errorMessage && <p className="p3 py-10 text-center text-error">{errorMessage}</p>}

      <PageFooter>
        <button className="btn mb-2" onClick={handleSaveClick} disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Save"}
        </button>
        <button className="btn btn-danger" onClick={handleResetClick} disabled={isSubmitting}>
          Reset
        </button>
      </PageFooter>

      {showConfirmationModal && (
        <ConfirmationModal
          title={getModalTitle()}
          message={getModalMessage()}
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
