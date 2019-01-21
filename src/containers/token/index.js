import React, { PureComponent } from 'react'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import Img from 'react-image'
import * as mime from 'mime-types'

import { arbitrableTokenList, arbitrator, web3 } from '../../bootstrap/dapp-api'
import EtherScanLogo from '../../assets/images/etherscan.png'
import Button from '../../components/button'
import FilterBar from '../filter-bar'
import { hasPendingRequest, isRegistrationRequest } from '../../utils/token'
import { getFileIcon } from '../../utils/evidence'
import * as filterActions from '../../actions/filter'
import * as filterSelectors from '../../reducers/filter'
import * as tokenActions from '../../actions/token'
import * as modalActions from '../../actions/modal'
import * as modalConstants from '../../constants/modal'
import * as tokenConstants from '../../constants/token'
import * as walletSelectors from '../../reducers/wallet'
import * as arbitrableTokenListSelectors from '../../reducers/arbitrable-token-list'
import './token.css'

// Truncate with ellipsis in the middle.
const truncateMiddle = str =>
  `${str.slice(0, 6)}...${str.slice(str.length - 5, str.length - 1)}`

const getRemainingTime = (token, arbitrableTokenListData, currentTime) => {
  const { latestRequest } = token
  let time
  if (
    !latestRequest.challengerDepositTime ||
    latestRequest.challengerDepositTime === 0
  )
    time =
      latestRequest.submissionTime +
      arbitrableTokenListData.data.challengePeriodDuration -
      currentTime
  else if (latestRequest.disputed === false)
    time =
      latestRequest.challengerDepositTime +
      arbitrableTokenListData.data.arbitrationFeesWaitingTime -
      currentTime
  else if (
    latestRequest.dispute.status ===
    tokenConstants.DISPUTE_STATUS.Appealable.toString()
  ) {
    const appealPeriodEnd =
      Number(latestRequest.latestRound.appealPeriod[1]) * 1000
    time = appealPeriodEnd - currentTime
  }

  return time > 0 ? time : 0
}

class TokenDetails extends PureComponent {
  static propTypes = {
    // State
    filter: filterSelectors.filterShape.isRequired,
    accounts: walletSelectors.accountsShape.isRequired,
    arbitrableTokenListData:
      arbitrableTokenListSelectors.arbitrableTokenListDataShape.isRequired,
    token: PropTypes.shape({
      name: PropTypes.string,
      ticker: PropTypes.string,
      addr: PropTypes.string,
      URI: PropTypes.string
    }),
    match: PropTypes.shape({
      params: PropTypes.shape({
        tokenID: PropTypes.string
      })
    }),

    // Functions
    timeout: PropTypes.func.isRequired,
    fetchToken: PropTypes.func.isRequired,
    openActionModal: PropTypes.func.isRequired,
    toggleFilter: PropTypes.func.isRequired
  }

  static defaultProps = {
    match: {},
    token: null
  }

  state = {
    timestamp: null,
    countdown: null,
    listeningForEvidence: false,
    evidences: []
  }

  interval = null

  handleFilterChange = key => {
    const { toggleFilter } = this.props
    toggleFilter(key)
  }

  handleActionClick = (action, side) => {
    const { openActionModal } = this.props
    openActionModal(action, side)
  }

  handleExecuteRequestClick = () => {
    const { match, timeout } = this.props
    const { tokenID } = match.params
    timeout(tokenID)
  }

  handleFeesTimeoutClick = () => {
    const { timeout, token } = this.props
    timeout(token)
  }

  handleOpenEvidenceModal = () => {
    const { openActionModal } = this.props
    openActionModal(modalConstants.ACTION_MODAL_ENUM.SubmitEvidence)
  }

  handleViewEvidenceClick = evidence => () => {
    const { openActionModal } = this.props
    openActionModal(modalConstants.ACTION_MODAL_ENUM.ViewEvidence, evidence)
  }

  toSentenceCase = input => {
    input = input.toLowerCase()
    return input.charAt(0).toUpperCase() + input.slice(1)
  }

  getActionButton = (token, userAccount) => {
    const { arbitrableTokenListData } = this.props
    const { timestamp, countdown } = this.state
    let method
    let disabled = true
    let label = 'Loading...'
    let icon = 'spinner'

    if (
      !token ||
      !arbitrableTokenListData.data ||
      token.creating ||
      token.updating
    )
      return (
        <Button disabled={disabled} type="primary">
          <FontAwesomeIcon className="TokenDetails-icon" icon={icon} />
          {label}
        </Button>
      )

    const challengePeriodDuration = Number(
      arbitrableTokenListData.data.challengePeriodDuration
    )
    const arbitrationFeesWaitingTime = Number(
      arbitrableTokenListData.data.arbitrationFeesWaitingTime
    )
    const { latestRequest } = token
    const { latestRound, challengerDepositTime } = latestRequest
    const submitterFees = latestRound.paidFees[tokenConstants.SIDE.Requester]
    const challengerFees = latestRound.paidFees[tokenConstants.SIDE.Challenger]

    if (hasPendingRequest(token))
      if (latestRequest.disputed && !latestRequest.resolved) {
        icon = 'hourglass-half'
        disabled = true
        label = 'Waiting Arbitration'
        if (
          Number(latestRequest.dispute.status) ===
            tokenConstants.DISPUTE_STATUS.Appealable &&
          !latestRound.appealed
        ) {
          const appealPeriodStart = Number(
            latestRequest.latestRound.appealPeriod[0]
          )
          const appealPeriodEnd = Number(
            latestRequest.latestRound.appealPeriod[1]
          )
          const appealPeriodDuration = appealPeriodEnd - appealPeriodStart
          const endOfFirstHalf = appealPeriodStart + appealPeriodDuration / 2
          if (
            (userAccount ===
              token.latestRequest.parties[tokenConstants.SIDE.Requester] ||
              userAccount ===
                token.latestRequest.parties[tokenConstants.SIDE.Challenger]) &&
            timestamp < appealPeriodEnd
          ) {
            let losingSide
            if (
              userAccount ===
                token.latestRequest.parties[tokenConstants.SIDE.Requester] &&
              token.latestRequest.dispute.ruling ===
                tokenConstants.RULING_OPTIONS.Refuse.toString()
            )
              losingSide = true
            else if (
              userAccount ===
                token.latestRequest.parties[tokenConstants.SIDE.Challenger] &&
              token.latestRequest.dispute.ruling ===
                tokenConstants.RULING_OPTIONS.Accept.toString()
            )
              losingSide = true

            const SIDE =
              userAccount ===
              token.latestRequest.parties[tokenConstants.SIDE.Requester]
                ? tokenConstants.SIDE.Requester
                : tokenConstants.SIDE.Challenger

            if (!losingSide) {
              label = 'Pay Appeal Fees'
              disabled = false
              method = () =>
                this.handleActionClick(
                  modalConstants.ACTION_MODAL_ENUM.FundAppeal,
                  SIDE
                )
            } else if (timestamp < endOfFirstHalf) {
              label = 'Pay Appeal Fees'
              disabled = false
              method = () =>
                this.handleActionClick(
                  modalConstants.ACTION_MODAL_ENUM.FundAppeal,
                  SIDE
                )
            }
          }
        }
      } else if (
        submitterFees > 0 &&
        challengerFees > 0 &&
        timestamp > challengerDepositTime + arbitrationFeesWaitingTime
      ) {
        icon = 'gavel'
        disabled = false
        method = this.handleExecuteRequestClick
        if (submitterFees > challengerFees) label = 'Timeout Challenger'
        else label = 'Timeout Submitter'
      } else if (
        timestamp >= latestRequest.submissionTime + challengePeriodDuration ||
        (countdown && countdown.getTime && countdown.getTime() === 0)
      ) {
        method = this.handleExecuteRequestClick
        icon = 'check'
        disabled = false
        label = 'Execute Request'
      } else if (
        challengerDepositTime > 0 &&
        timestamp - challengerDepositTime < arbitrationFeesWaitingTime
      ) {
        icon = 'gavel'
        label = 'Pay Arbitration Fees'
        disabled = false
        if (
          challengerFees > submitterFees &&
          userAccount ===
            token.latestRequest.parties[tokenConstants.SIDE.Requester]
        )
          method = () =>
            this.handleActionClick(
              modalConstants.ACTION_MODAL_ENUM.FundRequester
            )
        else if (
          submitterFees > challengerFees &&
          userAccount ===
            token.latestRequest.parties[tokenConstants.SIDE.Challenger]
        )
          method = () =>
            this.handleActionClick(
              modalConstants.ACTION_MODAL_ENUM.FundChallenger
            )
        else {
          icon = 'hourglass-half'
          label = 'Waiting Requester Fees'
          disabled = true
        }
      } else if (
        userAccount === latestRequest.parties[tokenConstants.SIDE.Requester]
      ) {
        icon = 'hourglass-half'
        disabled = true
        label = 'Waiting Challenges'
      } else {
        icon = 'gavel'
        disabled = false
        method = () =>
          this.handleActionClick(modalConstants.ACTION_MODAL_ENUM.Challenge)
        if (isRegistrationRequest(token.status))
          label = 'Challenge Registration'
        else label = 'Challenge Clearing'
      }
    else {
      disabled = false
      if (
        token.status === tokenConstants.IN_CONTRACT_STATUS_ENUM['Registered']
      ) {
        method = () =>
          this.handleActionClick(modalConstants.ACTION_MODAL_ENUM.Clear)
        label = 'Submit Clearing Request'
        icon = 'times-circle'
      } else {
        label = 'Resubmit Token'
        icon = 'plus'
        method = () =>
          this.handleActionClick(modalConstants.ACTION_MODAL_ENUM.Resubmit)
      }
    }

    return (
      <Button disabled={disabled} onClick={method} type="primary">
        <FontAwesomeIcon className="TokenDetails-icon" icon={icon} />
        {label}
      </Button>
    )
  }

  componentDidMount() {
    const { match, fetchToken } = this.props
    const { tokenID } = match.params
    fetchToken(tokenID)
  }

  componentDidUpdate() {
    const { token, arbitrableTokenListData } = this.props
    const { countdown, listeningForEvidence } = this.state

    if (
      token &&
      hasPendingRequest(token) &&
      countdown === null &&
      arbitrableTokenListData &&
      arbitrableTokenListData.data
    ) {
      this.setState({ countdown: 'Loading...' })

      if (!listeningForEvidence && token.latestRequest.disputed) {
        // Listen for evidence events.
        this.setState({ listeningForEvidence: true })
        arbitrableTokenList.events
          .Evidence({
            filter: {
              arbitrator: arbitrator._address,
              disputeID: token.latestRequest.disputeID
            }, // Using an array means OR: e.g. 20 or 23
            fromBlock: 0
          })
          .on('data', async e => {
            const evidence = JSON.parse(
              await (await fetch(e.returnValues._evidence)).json()
            )

            evidence.icon = getFileIcon(mime.lookup(evidence.fileTypeExtension))
            const { evidences } = this.state
            this.setState({
              evidences: [...evidences, evidence]
            })
          })
      }

      // Set timer once we have data.
      web3.eth.getBlock('latest', (err, block) => {
        if (err) throw new Error(err)
        if (!block) window.location.reload() // Due to a web3js this method sometimes returns a null block https://github.com/paritytech/parity-ethereum/issues/8788.
        const time = getRemainingTime(
          token,
          arbitrableTokenListData,
          block.timestamp * 1000
        )
        this.setState({
          timestamp: block.timestamp,
          countdown: new Date(time)
        })
        this.interval = setInterval(() => {
          const { countdown } = this.state
          if (countdown > 0)
            this.setState({ countdown: new Date(countdown - 1000) })
        }, 1000)
      })
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval)
  }

  render() {
    const { countdown, evidences } = this.state
    const { token, accounts, filter, match } = this.props
    const { filters } = filter
    const { tokenID } = match.params

    if (!token)
      return (
        <div className="Page">
          <h5>Loading...</h5>
        </div>
      )

    if (token.ID !== tokenID) return window.location.reload()

    return (
      <div className="Page">
        <FilterBar
          filter={filters}
          handleFilterChange={this.handleFilterChange}
        />
        <div className="TokenDetails">
          <Img
            className="TokenDetails-img"
            src={`https://staging-cfs.s3.us-east-2.amazonaws.com/${
              token.symbolMultihash
            }`}
          />
          <div className="TokenDetails-card">
            <div className="TokenDetails-label">
              <span className="TokenDetails-label-name">{token.name}</span>
              <span className="TokenDetails-label-ticker">{token.ticker}</span>
            </div>
            <div className="TokenDetails-divider" />
            <div className="TokenDetails-meta">
              <div className="TokenDetails-meta--aligned">
                <span>
                  <a
                    className="TokenDetails--link"
                    href={`https://etherscan.io/token/${token.addr}`}
                  >
                    <Img
                      className="TokenDetails-icon TokenDetails-meta--aligned"
                      src={EtherScanLogo}
                    />
                    {truncateMiddle(token.ID)}
                  </a>
                </span>
              </div>
              <div>
                <span>
                  <span className="TokenDetails-icon-badge TokenDetails-meta--aligned">
                    1
                  </span>
                  Badges
                </span>
              </div>
            </div>
            <div className="TokenDetails-meta">
              <span className="TokenDetails-meta--aligned">
                <FontAwesomeIcon
                  className="TokenDetails-icon"
                  color={tokenConstants.STATUS_COLOR_ENUM[token.clientStatus]}
                  icon={tokenConstants.STATUS_ICON_ENUM[token.clientStatus]}
                />
                {this.toSentenceCase(
                  tokenConstants.STATUS_ENUM[token.clientStatus]
                )}
              </span>
              <div
                className={`TokenDetails-timer ${
                  token.clientStatus <= 1 ||
                  (hasPendingRequest(token.status, token.latestRequest) &&
                    token.latestRequest.dispute &&
                    token.latestRequest.dispute.status !==
                      tokenConstants.DISPUTE_STATUS.Appealable.toString()) ||
                  Number(countdown) === 0
                    ? `Hidden`
                    : ``
                }`}
              >
                Challenge Deadline{' '}
                {countdown instanceof Date
                  ? countdown.toISOString().substr(11, 8)
                  : '--:--:--'}
              </div>
            </div>
            <div className="TokenDetails-action">
              {this.getActionButton(token, accounts.data[0])}
            </div>
          </div>
        </div>
        <br />
        {token.latestRequest.disputed && !token.latestRequest.resolved && (
          <div className="TokenDescription">
            <hr className="TokenDescription-separator" />
            <h3>Evidence</h3>
            <div className="TokenDescription-evidence">
              <div className="TokenDescription-evidence--list">
                {evidences.map(evidence => (
                  <div
                    className="TokenDescription-evidence--item"
                    key={evidence.fileHash}
                    onClick={this.handleViewEvidenceClick(evidence)}
                  >
                    <FontAwesomeIcon icon={evidence.icon} size="2x" />
                  </div>
                ))}
              </div>
              <Button onClick={this.handleOpenEvidenceModal} type="secondary">
                Submit Evidence
              </Button>
            </div>
          </div>
        )}
        <br />
        {token.badges && token.badges.length > 0 && (
          <div className="TokenDescription">
            <hr className="TokenDescription-separator" />
            <h3>Badges</h3>
            <span>
              <span className="TokenDescription--icon--badge TokenDetails-meta--aligned" />
              Compliant with YY
            </span>
          </div>
        )}
      </div>
    )
  }
}

export default connect(
  state => ({
    token: state.token.token.data,
    accounts: state.wallet.accounts,
    arbitrableTokenListData: state.arbitrableTokenList.arbitrableTokenListData,
    filter: state.filter
  }),
  {
    fetchToken: tokenActions.fetchToken,
    timeout: tokenActions.timeout,
    openActionModal: modalActions.openActionModal,
    feesTimeout: tokenActions.feesTimeout,
    toggleFilter: filterActions.toggleFilter
  }
)(TokenDetails)
