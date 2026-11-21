import { Navigate } from 'react-router-dom';

// Notice creation is now handled inline on the ShowNotices page via the FormDrawer
const AddNotice = () => <Navigate to="/admin/notices" replace />;

export default AddNotice;
