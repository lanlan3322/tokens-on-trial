import React from 'react'
import PropTypes from 'prop-types'

import * as arbitrableTokenListSelectors from '../../../../reducers/arbitrable-token-list'
import * as arbitrableAddressListSelectors from '../../../../reducers/arbitrable-address-list'
import * as tokenSelectors from '../../../../reducers/token'
import { web3 } from '../../../../bootstrap/dapp-api'
import Button from '../../../../components/button'
import './clear.css'

const Clear = ({ tcr, closeActionModal, clearItem, item, badge }) => (
  <div>
    <h3 className="Modal-title">
      {!badge ? `Clear ${item.name}` : 'Remove badge'}
    </h3>
    <hr />
    <div className="Challenge-fees">
      <div>
        <p className="Challenge-fees-line">Challenge Stake</p>
        <p className="Challenge-fees-line">Arbitration Fee Stake</p>
        <p className="Challenge-fees-line">Arbitration Fees</p>
      </div>
      <div>
        <p className="Challenge-fees-line">
          <strong>
            {`${String(
              web3.utils.fromWei(
                String(web3.utils.toBN(tcr.data.challengeReward))
              )
            )}`}
          </strong>
        </p>
        <p className="Challenge-fees-line">
          <strong>
            {String(
              web3.utils.fromWei(
                String(
                  web3.utils
                    .toBN(tcr.data.arbitrationCost)
                    .mul(web3.utils.toBN(tcr.data.sharedStakeMultiplier))
                    .div(web3.utils.toBN(tcr.data.MULTIPLIER_PRECISION))
                )
              )
            )}
          </strong>
        </p>
        <p className="Challenge-fees-line">
          <strong>
            {String(
              web3.utils.fromWei(
                String(web3.utils.toBN(tcr.data.arbitrationCost))
              )
            )}
          </strong>
        </p>
      </div>
      <div className="Challenge-fees-symbols">
        <p className="Challenge-fees-line">
          <strong>ETH</strong>
        </p>
        <p className="Challenge-fees-line">
          <strong>ETH</strong>
        </p>
        <p className="Challenge-fees-line">
          <strong>ETH</strong>
        </p>
      </div>
    </div>
    <br />
    <div className="Challenge-fees">
      <div>
        <p className="Challenge-fees-line">Total Due:</p>
      </div>
      <div>
        <p className="Challenge-fees-line" style={{ marginLeft: '67px' }}>
          <strong>
            {String(
              web3.utils.fromWei(
                String(
                  web3.utils
                    .toBN(tcr.data.challengeReward)
                    .add(
                      web3.utils
                        .toBN(tcr.data.arbitrationCost)
                        .mul(web3.utils.toBN(tcr.data.sharedStakeMultiplier))
                        .div(web3.utils.toBN(tcr.data.MULTIPLIER_PRECISION))
                    )
                    .add(web3.utils.toBN(tcr.data.arbitrationCost))
                )
              )
            )}
          </strong>
        </p>
      </div>
      <div className="Challenge-fees-symbols">
        <p className="Challenge-fees-line">
          <strong>ETH</strong>
        </p>
      </div>
    </div>
    <br />
    <div className="Modal-actions">
      <Button
        className="Clear-return"
        onClick={closeActionModal}
        type="secondary"
      >
        Return
      </Button>
      <Button className="Clear-request" onClick={clearItem} type="primary">
        Request Clearing
      </Button>
    </div>
  </div>
)

Clear.propTypes = {
  // State
  item: tokenSelectors.tokenShape,
  tcr: PropTypes.oneOfType([
    arbitrableTokenListSelectors.arbitrableTokenListDataShape,
    arbitrableAddressListSelectors.arbitrableAddressListDataShape
  ]).isRequired,
  badge: PropTypes.bool,

  // Action Dispatchers
  closeActionModal: PropTypes.func.isRequired,
  clearItem: PropTypes.func.isRequired
}

Clear.defaultProps = {
  item: null,
  badge: false
}

export default Clear
