import axios from "axios";
import { getRequest, getSuccess, getFailed, getError, clearSearch } from "./searchSlice";

export { clearSearch };
export const searchGlobal = (q) => async (dispatch) => {
  if (!q || q.trim().length < 2) {
    dispatch(clearSearch());
    return;
  }
  dispatch(getRequest());
  try {
    const result = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/search`, {
      params: { q: q.trim() },
    });
    dispatch(getSuccess({ results: result.data, query: q.trim() }));
  } catch (error) {
    dispatch(getError(error));
  }
};
