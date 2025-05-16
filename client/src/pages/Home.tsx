import { useContext, useEffect, useState } from "react";

// components
import { PageContainer, PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";

// utils
import { backendAPI, setErrorMessage } from "@/utils";
import { SET_POLL } from "@/context/types";

const Home = () => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(false);

  const dispatch = useContext(GlobalDispatchContext);
  const { poll, profileId, visitor } = useContext(GlobalStateContext);
  const isAdmin = visitor?.isAdmin || false;

  // Initial fetch of poll data
  useEffect(() => {
    fetchPollData();
  }, []);

  useEffect(() => {
    if (profileId) {
      const visitorVote = poll?.results?.[profileId]?.answer;
      if (visitorVote != null) setSelectedOption(visitorVote);
    }
  }, [poll, profileId]);

  // Reusable fetch of the poll data
  const fetchPollData = () => {
    backendAPI
      .get("/poll")
      .then((res) => {
        const poll = res.data.poll;
        dispatch!({
          type: SET_POLL,
          payload: { poll },
        });
      })
      .catch((error) => setErrorMessage(dispatch, error))
      .finally(() => setIsLoading(false));
  };

  // Handle vote submission with POST req
  const handleVote = (optionIndex: number) => {
    // Optimistically update local state
    setSelectedOption(optionIndex);
    setAreButtonsDisabled(true);

    backendAPI
      .post("/vote", {
        optionId: optionIndex,
        profileId: profileId,
      })
      .then(() => {
        return backendAPI.get("/poll");
      })
      .then((res) => {
        const poll = res.data.poll;
        dispatch!({
          type: SET_POLL,
          payload: { poll },
        });
      })
      .catch((error) => setErrorMessage(dispatch, error))
      .finally(() => {
        setAreButtonsDisabled(false);
      });
  };

  return (
    <PageContainer isLoading={isLoading} headerText="Poll">
      {poll && poll.question ? (
        <div className="grid gap-4">
          <p className="mb-4">{poll.question}</p>

          {/* Display all the poll options dynamically as buttons */}
          {poll.answers?.map((ans, i) => {
            // Only render a button if the option text is not empty.
            if (ans.trim() === "") return null;

            // Determine if this option is selected by the current visitor.
            const userVote = poll.results && profileId ? poll.results[profileId]?.answer : undefined;
            const isSelected = userVote === i;

            // Calculate votes for this option and total votes.
            const votesForOption = poll.options?.[i]?.votes || 0;
            const totalVotes = Object.values(poll.options || {}).reduce(
              (sum, opt: { votes: number }) => sum + (opt.votes || 0),
              0,
            );

            // Compute vote text based on displayMode.
            const voteText =
              poll.displayMode === "percentage"
                ? totalVotes > 0
                  ? `${((votesForOption / totalVotes) * 100).toFixed(0)}%`
                  : "0%"
                : `${votesForOption} votes`;

            return (
              <button
                key={i}
                disabled={areButtonsDisabled}
                onClick={() => handleVote(i)}
                className={isSelected ? "btn" : "btn btn-outline"}
              >
                <div className="flex flex-auto items-stretch">
                  <div className="grow text-left">{ans}</div>
                  <div className={isSelected ? "text-sm text-white" : "p2"}>
                    {isAdmin || selectedOption !== null ? voteText : ""}
                  </div>
                </div>
              </button>
            );
          })}
          {/* Gradient bar code is commented out for now */}
          {/* <div
      style={{
        height: "4px", 
        background: `linear-gradient(to right, ${darkBlue} ${percentage}%, transparent ${percentage}%)`,
      }}
    /> */}
        </div>
      ) : (
        // If there is no poll data, show a message
        <p className="text-center"> There is currently no poll configured. </p>
      )}

      {/* Show the refresh button only if there are answers  */}
      {poll?.answers && (
        <PageFooter>
          <button className="btn" disabled={areButtonsDisabled} onClick={fetchPollData}>
            Refresh
          </button>
        </PageFooter>
      )}
    </PageContainer>
  );
};

export default Home;
