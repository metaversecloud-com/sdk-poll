import { useState } from "react";

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  handleToggleShowConfirmationModal: () => void;
}

/* 
  New confirmation modal component for displaying confirmation messages including
  customization props for re-use.
*/
export const ConfirmationModal = ({
  title,
  message,
  onConfirm,
  handleToggleShowConfirmationModal,
}: ConfirmationModalProps) => {
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(false);

  return (
    <div className="modal-container">
      <div className="modal">
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="actions">
          <button
            id="close"
            className="btn btn-outline"
            onClick={handleToggleShowConfirmationModal}
            disabled={areButtonsDisabled}
          >
            No
          </button>
          <button
            className="btn btn-danger-outline"
            onClick={() => {
              setAreButtonsDisabled(true);
              onConfirm();
              handleToggleShowConfirmationModal();
            }}
            disabled={areButtonsDisabled}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
