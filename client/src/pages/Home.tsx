import { useContext, useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";

// components
import { PageContainer, PageFooter } from "@/components";
import AdminIconButton from "@/components/AdminIconButton";
import AdminView from "@/components/AdminView";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

interface PollData {
  question: string;
  answers: string[];
  displayMode: "percentage" | "count";
  options?: { [key: string]: { votes: number } };
  results?: { [profileId: string]: { answer: number } };
}

const Home = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [reloadPoll, setReloadPoll] = useState(false);

  // const hasVoted = pollData?.results?.[profileId] !== undefined;

  const dispatch = useContext(GlobalDispatchContext);
  const { visitor } = useContext(GlobalStateContext);
  const profileId = visitor?.profileId || null;
  const isAdmin = visitor?.isAdmin || false;

  const hasMounted = useRef(false);


  // Initial fetch of poll data
  useEffect(() => {
    backendAPI
      .get("/updatePoll")
      .then((res) => {
        const poll = res.data.poll;
        const visitorVote = poll?.results?.[profileId]?.answer;
        console.log("Visitor Vote:", visitorVote);
        if (!(visitorVote == null)) {
          setSelectedOption(visitorVote);
          console.log(selectedOption);
        }
        setPollData(poll ?? null);
      })
      .catch((error) => setErrorMessage(dispatch, error));
  }, []);

  // Reload poll data when AdminView is closed NOT when the page is reloaded
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    console.log("Fetching poll data again...");
    backendAPI
      .get("/updatePoll")
      .then((res) => {
        const poll = res.data.poll;
        const sameResults = JSON.stringify(poll?.results) === JSON.stringify(pollData?.results);
        if (!sameResults) {   
          setSelectedOption(null);   
        }
        setPollData(poll ?? null);
      })
      .catch((error) => setErrorMessage(dispatch, error));
  }, [reloadPoll]);

  const closeAdminView = () => {
    setReloadPoll(prev => !prev); // toggles the trigger and causes the effect to run
  };
  

  if (!visitor) {
    return <div>Loading...</div>;
  }

  const handleVote = (optionIndex: number) => {
    // Optimistically update local state
    setSelectedOption(optionIndex);

    backendAPI
      .post("/vote", {
        optionId: optionIndex,
        profileId: profileId,
      })
      .then((res) => {
        console.log(visitor.profileId, "VOTED FOR:", optionIndex);
        console.log("Vote submitted successfully", res.data);
        return backendAPI.get("/updatePoll");
      })
      .then((res) => {
        const poll = res.data.poll;
        setPollData(poll ?? null);
      })
      .catch((error) => setErrorMessage(dispatch, error));
  };

  return (
    <PageContainer>
      {visitor && visitor.isAdmin && (
        <div className="flex justify-end mb-4">
          <AdminIconButton
            setShowSettings={() => setShowSettings(!showSettings)}
            showSettings={showSettings}
            onClose={closeAdminView}
          />
        </div>
      )}

      {showSettings ? (
        <AdminView />
      ) : (
        <div>
          <h1 className="h2 text-center" style={{ marginBottom: '1rem' }}>Poll App</h1>
          {pollData && pollData.question ? (
            <section className="mt-6">
              <p style={{ marginBottom: '1rem' }}>
                {/* <strong>Question:</strong>  */}
                {pollData.question}
              </p>
              <div className="flex flex-col gap-4">
                {pollData.answers?.map((ans, i) => {
                  // Only render a button if the option text is not empty.
                  if (ans.trim() === "") return null;

                  // Determine if this option is selected by the current visitor.
                  const userVote =
                    pollData.results && visitor?.profileId
                      ? pollData.results[visitor.profileId]?.answer
                      : undefined;
                  const isSelected = userVote === i;

                  // Calculate votes for this option and total votes.
                  const votesForOption = pollData.options?.[i]?.votes || 0;
                  const totalVotes = Object.values(pollData.options || {}).reduce(
                    (sum, opt: { votes: number }) => sum + (opt.votes || 0),
                    0
                  );

                  // Compute vote text based on displayMode.
                  const voteText =
                    pollData.displayMode === "percentage"
                      ? totalVotes > 0
                        ? `${((votesForOption / totalVotes) * 100).toFixed(0)}%`
                        : "0%"
                      : `${votesForOption} votes`;

                  return (
                    <div key={i} className="w-full">
                      <button
                        onClick={() => handleVote(i)}
                        className={`btn btn-lg w-full ${
                          isSelected
                            ? "border-2 border-blue-500 bg-transparent"
                            : "btn-outline"
                        }`}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            width: "100%",
                          }}
                          className="py-2" 
                        >
                          <span style={{ textAlign: "left", width: "100%" }}>
                            {ans}
                          </span>
                          <span style={{ textAlign: "right", width: "100%", opacity: isAdmin || selectedOption !== null ? 1 : 0,  }} className="italic transition-opacity duration-300 ease-in-out"> 
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
              <p>
                {/* <strong>Display Mode:</strong> {pollData.displayMode} */}
              </p>
            </section>
          ) : (
            <p>There is currently no poll configured.</p>
          )}
        </div>
      )}
      <PageFooter />
    </PageContainer>
  );
};

export default Home;
