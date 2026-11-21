import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../redux/userRelated/userHandle';
import styled from 'styled-components';

const Logout = () => {
  const { currentUser, currentRole } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  const handleCancel = () => {
    // Go back, but if there's no history fall back to the role dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <PageBackground>
      <LogoutContainer>
        <UserName>{currentUser?.firstName} {currentUser?.lastName}</UserName>
        <LogoutMessage>Are you sure you want to sign out?</LogoutMessage>
        <ButtonContainer>
          <LogoutButtonConfirm onClick={handleLogout}>Sign Out</LogoutButtonConfirm>
          <LogoutButtonCancel onClick={handleCancel}>Cancel</LogoutButtonCancel>
        </ButtonContainer>
      </LogoutContainer>
    </PageBackground>
  );
};

export default Logout;

const PageBackground = styled.div`
  background-color: #85769f66;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const LogoutContainer = styled.div`
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 40px;
  background-color: #fff;
  color: black;
`;
const UserName = styled.h1`
  text-align: center;
  font-size: 2rem;
  font-family: 'Times New Roman', Times, serif;
`;
const LogoutMessage = styled.p`
  margin-bottom: 20px;
  font-size: 16px;
  text-align: center;
`;
const LogoutButton = styled.button`
  padding: 6px 12px;
  margin-top: 10px;
  border-radius: 5px;
  font-size: 16px;
  color: #fff;
  cursor: pointer;
  border: none;
  &:hover { background-color: #333; }
`;
const LogoutButtonConfirm = styled(LogoutButton)`background-color: #ea0606;`;
const LogoutButtonCancel = styled(LogoutButton)`background-color: rgb(99, 60, 99);`;
const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin-top: 10px;
`;
