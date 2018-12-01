import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import * as modalActions from '../../actions/modal'
import * as modalSelectors from '../../reducers/modal'
import * as modalConstants from '../../constants/modal'
import * as tokenConstants from '../../constants/token'
import * as tokenActions from '../../actions/token'
import * as tokenSelectors from '../../reducers/token'
import * as arbitrableTokenListActions from '../../actions/arbitrable-token-list'
import * as arbitrableTokenListSelectors from '../../reducers/arbitrable-token-list'
import * as walletSelectors from '../../reducers/wallet'
import { web3 } from '../../bootstrap/dapp-api'
import Modal from '../../components/modal'

import FundAppeal from './components/appeal'
import FundDispute from './components/fund-dispute'
import Submit from './components/submit'
import Resubmit from './components/resubmit'
import Clear from './components/clear'
import Challenge from './components/challenge'
import {
  getTokenFormIsInvalid,
  submitTokenForm
} from './components/submit/token-form'

import './token-modal.css'

class TokenModal extends PureComponent {
  static propTypes = {
    token: tokenSelectors.tokenShape,
    tokenFormIsInvalid: PropTypes.bool.isRequired,
    openTokenModal: modalSelectors.openTokenModalShape,
    arbitrableTokenListData:
      arbitrableTokenListSelectors.arbitrableTokenListDataShape.isRequired,
    accounts: walletSelectors.accountsShape.isRequired,

    closeTokenModal: PropTypes.func.isRequired,
    fetchArbitrableTokenListData: PropTypes.func.isRequired,
    submitTokenForm: PropTypes.func.isRequired,
    createToken: PropTypes.func.isRequired,
    clearToken: PropTypes.func.isRequired,
    fundDispute: PropTypes.func.isRequired,
    resubmitToken: PropTypes.func.isRequired,
    fundAppeal: PropTypes.func.isRequired
  }

  static defaultProps = {
    openTokenModal: null,
    token: null
  }

  handleSubmitTokenClick = token => {
    const { createToken } = this.props
    createToken({ tokenData: token })
  }

  handleResubmitTokenClick = () => {
    const { resubmitToken, token } = this.props
    resubmitToken({ tokenData: token.data })
  }

  handleClearTokenClick = () => {
    const { clearToken, token } = this.props
    clearToken({ tokenData: token.data })
  }

  handleChallengeClick = () => {
    const { fundDispute, token, arbitrableTokenListData } = this.props
    const { latestRequest } = token.data
    const { latestRound } = latestRequest

    const value = web3.utils
      .toBN(latestRequest.challengeReward)
      .add(web3.utils.toBN(latestRound.requiredFeeStake))
      .add(web3.utils.toBN(arbitrableTokenListData.data.arbitrationCost))
    fundDispute({
      ID: token.data.ID,
      value,
      side: tokenConstants.SIDE.Challenger
    })
  }

  handleFundRequesterClick = () => {
    const { fundDispute, token, arbitrableTokenListData } = this.props
    const { latestRequest } = token.data
    const { latestRound } = latestRequest

    const value = web3.utils
      .toBN(latestRound.requiredFeeStake)
      .add(web3.utils.toBN(arbitrableTokenListData.data.arbitrationCost))
    fundDispute({
      ID: token.data.ID,
      value,
      side: tokenConstants.SIDE.Requester
    })
  }

  handleFundChallengerClick = () => {
    const { fundDispute, token, arbitrableTokenListData } = this.props
    const { latestRequest } = token.data
    const { latestRound } = latestRequest
    const { arbitrationCost } = arbitrableTokenListData.data

    const value = web3.utils
      .toBN(latestRound.requiredFeeStake)
      .add(web3.utils.toBN(arbitrationCost))
    fundDispute({
      ID: token.data.ID,
      value,
      side: tokenConstants.SIDE.Challenger
    })
  }

  handleFundAppealClick = () => {
    const { fundAppeal, token, accounts } = this.props
    const tokenData = token.data
    const { latestRequest } = tokenData
    const { latestRound } = latestRequest

    const userAccount = accounts.data[0]
    let losingSide = false
    if (
      userAccount === latestRequest.parties[tokenConstants.SIDE.Requester] &&
      latestRequest.dispute.ruling ===
        tokenConstants.RULING_OPTIONS.Refuse.toString()
    )
      losingSide = true
    else if (
      userAccount === latestRequest.parties[tokenConstants.SIDE.Challenger] &&
      latestRequest.dispute.ruling ===
        tokenConstants.RULING_OPTIONS.Accept.toString()
    )
      losingSide = true

    const value = losingSide
      ? String(
          web3.utils
            .toBN(latestRound.requiredFeeStake)
            .mul(web3.utils.toBN(2))
            .add(web3.utils.toBN(latestRequest.appealCost))
        )
      : String(
          web3.utils
            .toBN(latestRound.requiredFeeStake)
            .add(web3.utils.toBN(latestRequest.appealCost))
        )

    fundAppeal(tokenData.ID, losingSide, value)
  }

  componentDidMount() {
    const { fetchArbitrableTokenListData } = this.props
    fetchArbitrableTokenListData()
  }

  render() {
    const {
      openTokenModal,
      closeTokenModal,
      arbitrableTokenListData,
      submitTokenForm,
      tokenFormIsInvalid,
      token
    } = this.props

    return (
      <Modal
        isOpen={openTokenModal !== null}
        onRequestClose={closeTokenModal}
        className="TokenModal"
      >
        {(() => {
          switch (openTokenModal) {
            case modalConstants.TOKEN_MODAL_ENUM.Submit:
              return (
                <Submit
                  arbitrableTokenListData={arbitrableTokenListData}
                  closeTokenModal={closeTokenModal}
                  submitTokenForm={submitTokenForm}
                  submitToken={this.handleSubmitTokenClick}
                  tokenFormIsInvalid={tokenFormIsInvalid}
                />
              )
            case modalConstants.TOKEN_MODAL_ENUM.Clear:
              return (
                <Clear
                  name={token && token.data ? token.data.name : 'token'}
                  arbitrableTokenListData={arbitrableTokenListData}
                  closeTokenModal={closeTokenModal}
                  clearToken={this.handleClearTokenClick}
                />
              )
            case modalConstants.TOKEN_MODAL_ENUM.Challenge:
              return (
                <Challenge
                  token={token.data}
                  name={token && token.data ? token.data.name : 'token'}
                  arbitrableTokenListData={arbitrableTokenListData}
                  closeTokenModal={closeTokenModal}
                  fundDispute={this.handleChallengeClick}
                />
              )
            case modalConstants.TOKEN_MODAL_ENUM.Resubmit:
              return (
                <Resubmit
                  token={token.data}
                  name={token && token.data ? token.data.name : 'token'}
                  arbitrableTokenListData={arbitrableTokenListData}
                  closeTokenModal={closeTokenModal}
                  resubmitToken={this.handleResubmitTokenClick}
                />
              )
            case modalConstants.TOKEN_MODAL_ENUM.FundRequester:
              return (
                <FundDispute
                  token={token.data}
                  name={token && token.data ? token.data.name : 'token'}
                  arbitrableTokenListData={arbitrableTokenListData}
                  closeTokenModal={closeTokenModal}
                  fundDispute={this.handleFundRequesterClick}
                />
              )
            case modalConstants.TOKEN_MODAL_ENUM.FundChallenger:
              return (
                <FundDispute
                  token={token.data}
                  name={token && token.data ? token.data.name : 'token'}
                  arbitrableTokenListData={arbitrableTokenListData}
                  closeTokenModal={closeTokenModal}
                  fundDispute={this.handleFundChallengerClick}
                />
              )
            case modalConstants.TOKEN_MODAL_ENUM.FundAppeal:
              return (
                <FundAppeal
                  token={token.data}
                  closeTokenModal={closeTokenModal}
                  fundAppeal={this.handleFundAppealClick}
                />
              )
            case undefined:
            case null:
              break
            default:
              throw new Error('Unhandled modal request')
          }
        })()}
      </Modal>
    )
  }
}

export default connect(
  state => ({
    openTokenModal: state.modal.openTokenModal,
    tokenFormIsInvalid: getTokenFormIsInvalid(state),
    arbitrableTokenListData: state.arbitrableTokenList.arbitrableTokenListData,
    token: state.token.token,
    accounts: state.wallet.accounts
  }),
  {
    closeTokenModal: modalActions.closeTokenModal,
    createToken: tokenActions.createToken,
    clearToken: tokenActions.clearToken,
    resubmitToken: tokenActions.resubmitToken,
    fundDispute: tokenActions.fundDispute,
    submitTokenForm,
    fetchArbitrableTokenListData:
      arbitrableTokenListActions.fetchArbitrableTokenListData,
    fundAppeal: tokenActions.fundAppeal
  }
)(TokenModal)
