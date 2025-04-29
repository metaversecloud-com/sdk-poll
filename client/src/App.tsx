import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Route, Routes, useNavigate, useSearchParams } from "react-router-dom";

// pages
import Home from "@pages/Home";
import Error from "@pages/Error";
import { Loading } from "@components/Loading";

// context
import { GlobalDispatchContext } from "./context/GlobalContext";
import { InteractiveParams, SET_HAS_SETUP_BACKEND, SET_INTERACTIVE_PARAMS, SET_VISITOR_INFO } from "./context/types";

// utils
import { setupBackendAPI, backendAPI } from "./utils/backendAPI";

const App = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hasInitBackendAPI, setHasInitBackendAPI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const dispatch = useContext(GlobalDispatchContext);

  // Build interactiveParams from URL parameters
  const interactiveParams: InteractiveParams = useMemo(() => {
    return {
      assetId: searchParams.get("assetId") || "",
      displayName: searchParams.get("displayName") || "",
      identityId: searchParams.get("identityId") || "",
      interactiveNonce: searchParams.get("interactiveNonce") || "",
      interactivePublicKey: searchParams.get("interactivePublicKey") || "",
      profileId: searchParams.get("profileId") || "",
      sceneDropId: searchParams.get("sceneDropId") || "",
      uniqueName: searchParams.get("uniqueName") || "",
      urlSlug: searchParams.get("urlSlug") || "",
      username: searchParams.get("username") || "",
      visitorId: searchParams.get("visitorId") || "",
    };
  }, [searchParams]);

  // Dispatch interactive params to global state
  const setInteractiveParams = useCallback(
    (params: InteractiveParams) => {
      dispatch!({
        type: SET_INTERACTIVE_PARAMS,
        payload: {
          profileId: params.profileId,
          sceneDropId: params.sceneDropId,
        },
      });
    },
    [dispatch],
  );

  // Dispatch that backend setup has completed
  const setHasSetupBackend = useCallback(
    (success: boolean) => {
      dispatch!({
        type: SET_HAS_SETUP_BACKEND,
        payload: { hasSetupBackend: success },
      });
    },
    [dispatch],
  );

  // Initialize the backend API
  const setupBackend = () => {
    setupBackendAPI(interactiveParams)
      .then(() => setHasSetupBackend(true))
      .catch(() => navigate("*"))
      .finally(() => setHasInitBackendAPI(true));
  };

  // Fetch visitor data from backend and dispatch it into global state
  const getVisitor = () => {
    backendAPI
      .get("/visitor")
      .then((result) => {
        dispatch!({
          type: SET_VISITOR_INFO,
          payload: result.data.visitor,
        });
      })
      .catch((error) => {
        console.error("Error fetching visitor:", error?.response?.data?.message);
        navigate("*");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (interactiveParams.assetId) {
      setInteractiveParams(interactiveParams);
    }
  }, [interactiveParams, setInteractiveParams]);

  useEffect(() => {
    if (!hasInitBackendAPI) {
      setupBackend();
    } else {
      getVisitor();
    }
  }, [hasInitBackendAPI, interactiveParams]);

  if (isLoading || !hasInitBackendAPI) {
    return <Loading />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Error />} />
    </Routes>
  );
};

export default App;
