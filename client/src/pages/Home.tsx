import { useContext, useEffect, useState } from "react";

// components
import { PageContainer } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";

// utils
import { backendAPI, setErrorMessage } from "@/utils";
import { SET_POLL } from "@/context/types";

const Home = () => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Track loading state so we can update page container

  // const hasVoted = poll?.results?.[profileId] !== undefined;

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
      .catch((error) => setErrorMessage(dispatch, error));
  };

  return (
    // Wrap the entire page in the PageContainer component
    <PageContainer isLoading={isLoading}>
      <div>
        <h1 className="h2 text-center" style={{ marginBottom: "1rem" }}>
          Poll App
        </h1>
        {poll && poll.question ? (
          <section className="mt-6">
            <p style={{ marginBottom: "1rem" }}>
              {/* <strong>Question:</strong>  */}
              {poll.question}
            </p>

            {/* Display all the poll options dynamically as buttons */}
            <div className="flex flex-col gap-4">
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

                // the button rendering
                return (
                  <div key={i} className="w-full">
                    <button
                      onClick={() => handleVote(i)}
                      className={`
                          btn btn-lg 
                          w-full
                          !h-auto
                          !py-2
                           ${isSelected ? "border-2 border-blue-500 bg-transparent" : "btn-outline"}`}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          width: "100%",
                        }}
                        className="py-2"
                      >
                        <span style={{ textAlign: "left", width: "100%" }}>{ans}</span>
                        {/* Display the results (make them opqaue) if we are an admin or we have an option shown selected */}
                        <span
                          style={{
                            textAlign: "right",
                            width: "100%",
                            opacity: isAdmin || selectedOption !== null ? 1 : 0,
                          }}
                          className="italic transition-opacity duration-300 ease-in-out"
                        >
                          {voteText}
                        </span>
                      </div>
                    </button>

                    {/* Gradient bar code is commented out for now */}
                    {/* <div
                        style={{
                          height: "4px", 
                          background: `linear-gradient(to right, ${darkBlue} ${percentage}%, transparent ${percentage}%)`,
                        }}
                      /> */}
                  </div>
                );
              })}
            </div>

            {/* Show the refresh button only if there are answers, simply calls  */}
            {poll?.answers && (
              <div className="mt-8 flex justify-center">
                <button className="btn btn-secondary !w-auto !px-5 !py-5" onClick={fetchPollData}>
                  Refresh
                </button>
              </div>
            )}

            <p>
              {/* debug info for display mode */}
              {/* <strong>Display Mode:</strong> {poll.displayMode} */}
            </p>
          </section>
        ) : (
          // If there is no poll data, show a message
          <p className="text-center"> There is currently no poll configured. </p>
        )}
      </div>
    </PageContainer>
  );
};

export default Home;
