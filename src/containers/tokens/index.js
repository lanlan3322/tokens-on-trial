import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import memoizeOne from 'memoize-one'

import TitleBar from '../../components/title-bar'
import TokenCard from '../../components/token-card'
import FilterBar from '../../components/filter-bar'
import SortBar from '../../components/sort-bar'
import * as tokenSelectors from '../../reducers/token'
import * as arbitrableTokenListActions from '../../actions/arbitrable-token-list'
import * as tokenActions from '../../actions/token'
import * as tokenConstants from '../../constants/token'
import { filterToContractParam, defaultFilter } from '../../utils/filter'

import './tokens.css'

class Tokens extends Component {
  static propTypes = {
    // Redux State
    tokens: tokenSelectors.tokensShape.isRequired,

    // Action Dispatchers
    fetchArbitrableTokenListData: PropTypes.func.isRequired,
    fetchTokens: PropTypes.func.isRequired
  }

  state = {
    sortValue: 0,
    sort: { [tokenConstants.SORT_OPTIONS_ENUM[0]]: 'ascending' },
    filter: defaultFilter()
  }

  ref = React.createRef()
  fillPageTimeout = null

  componentDidMount() {
    const { fetchArbitrableTokenListData } = this.props
    fetchArbitrableTokenListData()
    this.fetchTokens(true)
  }

  componentDidUpdate(prevProps) {
    const { tokens: prevTokens } = prevProps
    const { tokens } = this.props
    clearTimeout(this.fillPageTimeout)
    this.fillPageTimeout = setTimeout(() => {
      if (
        prevTokens !== tokens &&
        !tokens.loading &&
        tokens.data &&
        tokens.data.hasMore &&
        this.ref.current.clientHeight === this.ref.current.scrollHeight
      )
        this.fetchTokens()
    }, 500)
  }

  mapTokens = memoizeOne(tokens =>
    tokens.map(token => {
      token.name = 'Pinakion'
      token.URL =
        'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIyLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1OTYgNTI5IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1OTYgNTI5OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6IzYzNjU2OTt9Cgkuc3Qxe2ZpbGw6dXJsKCNTVkdJRF8xXyk7fQoJLnN0MntmaWxsOnVybCgjU1ZHSURfMl8pO30KCS5zdDN7ZmlsbDp1cmwoI1NWR0lEXzNfKTt9Cgkuc3Q0e2ZpbGw6IzczNzQ3ODt9Cgkuc3Q1e2ZpbGw6IzZCNkM3MTt9Cgkuc3Q2e2ZpbGw6IzU0NTY1QTt9Cgkuc3Q3e29wYWNpdHk6MC43O2ZpbGw6IzFGMjAyNTtlbmFibGUtYmFja2dyb3VuZDpuZXcgICAgO30KCS5zdDh7b3BhY2l0eTowLjc7ZmlsbDojMkMyQzMxO2VuYWJsZS1iYWNrZ3JvdW5kOm5ldyAgICA7fQoJLnN0OXtvcGFjaXR5OjAuNztmaWxsOiM0RDRCNTA7ZW5hYmxlLWJhY2tncm91bmQ6bmV3ICAgIDt9Cgkuc3QxMHtvcGFjaXR5OjAuNztmaWxsOiMzQzNCNDE7ZW5hYmxlLWJhY2tncm91bmQ6bmV3ICAgIDt9Cgkuc3QxMXtvcGFjaXR5OjAuNztmaWxsOiMzRjNENDM7ZW5hYmxlLWJhY2tncm91bmQ6bmV3ICAgIDt9Cgkuc3QxMntvcGFjaXR5OjAuNztmaWxsOiM0MzQyNDg7ZW5hYmxlLWJhY2tncm91bmQ6bmV3ICAgIDt9Cgkuc3QxM3tvcGFjaXR5OjAuNztmaWxsOiM0RjRENTM7ZW5hYmxlLWJhY2tncm91bmQ6bmV3ICAgIDt9Cjwvc3R5bGU+Cjx0aXRsZT5LTEVST1MtbG9nby1zeW1ib2w8L3RpdGxlPgo8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjU5NiwyNzYuOSA0MjguNywxMDcuMiAzODQuNyw0MzIuNyAiLz4KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8xXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxMjQuNzEiIHkxPSI2NzYuMDQ1IiB4Mj0iNDI4LjcxIiB5Mj0iNjc2LjA0NSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSAwIDk0NikiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6I0ExQTJBNSIvPgoJPHN0b3AgIG9mZnNldD0iMC4yNyIgc3R5bGU9InN0b3AtY29sb3I6IzlEOUVBMSIvPgoJPHN0b3AgIG9mZnNldD0iMC41NiIgc3R5bGU9InN0b3AtY29sb3I6IzkwOTE5NCIvPgoJPHN0b3AgIG9mZnNldD0iMC44NiIgc3R5bGU9InN0b3AtY29sb3I6IzdBN0M4MCIvPgoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzZFNzA3NCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cG9seWdvbiBjbGFzcz0ic3QxIiBwb2ludHM9IjEyNC43LDIzOC43IDQyOC43LDEwNy4yIDM4NC43LDQzMi43ICIvPgo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzJfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjEyMi42OTciIHkxPSI3MTEuNjQzIiB4Mj0iMzM4LjY5NyIgeTI9IjkyNS41NTMiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgMCA5NDYpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiM5NDk1OTgiLz4KCTxzdG9wICBvZmZzZXQ9IjAuMzQiIHN0eWxlPSJzdG9wLWNvbG9yOiM4RThGOTIiLz4KCTxzdG9wICBvZmZzZXQ9IjAuNzkiIHN0eWxlPSJzdG9wLWNvbG9yOiM3RDdFODIiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiM3Mzc0NzgiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBvbHlnb24gY2xhc3M9InN0MiIgcG9pbnRzPSI0MjguNywxMDcuMiAxODEuNywwIDEyNC43LDIzOC43ICIvPgo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzNfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjEzOS4zNTE4IiB5MT0iNzE0LjY2MyIgeDI9IjI1NC43MzE4IiB5Mj0iNDg1Ljg0MjkiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgMCA5NDYpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiM5QzlEQTAiLz4KCTxzdG9wICBvZmZzZXQ9IjAuMjgiIHN0eWxlPSJzdG9wLWNvbG9yOiM5OTlBOUQiLz4KCTxzdG9wICBvZmZzZXQ9IjAuNSIgc3R5bGU9InN0b3AtY29sb3I6IzhGOTA5MyIvPgoJPHN0b3AgIG9mZnNldD0iMC43IiBzdHlsZT0ic3RvcC1jb2xvcjojN0U4MDgzIi8+Cgk8c3RvcCAgb2Zmc2V0PSIwLjg4IiBzdHlsZT0ic3RvcC1jb2xvcjojNjc2OTZDIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojNTQ1NjVBIi8+CjwvbGluZWFyR3JhZGllbnQ+Cjxwb2x5Z29uIGNsYXNzPSJzdDMiIHBvaW50cz0iMTI0LjcsMjM4LjcgMTMwLjUsNDk5LjEgMzg0LjcsNDMyLjcgIi8+Cjxwb2x5Z29uIGNsYXNzPSJzdDQiIHBvaW50cz0iNDI4LjcsMTA3LjIgNDc1LjQsMTMuMSAxODEuNywwICIvPgo8cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjQ3NS40LDEzLjEgNTk2LDI3Ni45IDQyOC43LDEwNy4yICIvPgo8cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjU5NiwyNzYuOSA0MjcuMiw1MTcgMzg0LjcsNDMyLjcgIi8+Cjxwb2x5Z29uIGNsYXNzPSJzdDYiIHBvaW50cz0iNDI3LjIsNTE3IDEzMC41LDQ5OS4xIDM4NC43LDQzMi43ICIvPgo8cG9seWdvbiBjbGFzcz0ic3Q2IiBwb2ludHM9IjE4MS43LDAgMTAuNywyMTMuNiAxMjQuNywyMzguNyAiLz4KPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxMC43LDIxMy42IDEzMC41LDQ5OS4xIDEyNC43LDIzOC43ICIvPgo8cG9seWdvbiBjbGFzcz0ic3Q3IiBwb2ludHM9IjM5Ny42LDE1Mi4xIDM2Ni44LDM4NS40IDE4NS4yLDI0NC45ICIvPgo8cG9seWdvbiBjbGFzcz0ic3Q3IiBwb2ludHM9IjM3MywxMDUuNSAyMDMuMiwzMi40IDE2Ny42LDE4Ni4xICIvPgo8cG9seWdvbiBjbGFzcz0ic3Q4IiBwb2ludHM9IjMzMCw0MjAuNyAxNDUuNSwyODguOSAxNDkuOSw0NjcuNSAiLz4KPHBvbHlnb24gY2xhc3M9InN0OCIgcG9pbnRzPSI1NjUsMjc2LjMgNDM5LjMsMTQ4LjcgNDA2LjEsMzk0LjEgIi8+Cjxwb2x5Z29uIGNsYXNzPSJzdDkiIHBvaW50cz0iMzczLjIsNDQ5LjQgNDAwLjYsNTAxLjggMjE3LjYsNDkwLjEgIi8+Cjxwb2x5Z29uIGNsYXNzPSJzdDEwIiBwb2ludHM9IjU0MC40LDMzNC4yIDQwNC4yLDQzNS43IDQzMS4zLDQ4OC42ICIvPgo8cG9seWdvbiBjbGFzcz0ic3QxMCIgcG9pbnRzPSI0NzYsNTAgNTQ4LDIwNC40IDQ0OS42LDEwNC4zICIvPgo8cG9seWdvbiBjbGFzcz0ic3QxMSIgcG9pbnRzPSI0NDMuMSwyNCA0MTIuOCw3OS40IDI3MC4xLDE2LjkgIi8+Cjxwb2x5Z29uIGNsYXNzPSJzdDEyIiBwb2ludHM9IjE1Ny41LDQ5LjEgMTE3LjMsMjE5LjIgMzYuNCwyMDIuMSAiLz4KPHBvbHlnb24gY2xhc3M9InN0MTMiIHBvaW50cz0iMTEyLjQsMjQ5LjMgMTE2LDQzMi4xIDMxLjEsMjMyICIvPgo8L3N2Zz4K'
      token.ticker = 'PNK'
      token.address = '0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d'
      token.badges = []
      return <TokenCard key={token.ID} token={token} />
    })
  )

  handleFilterChange = key => {
    const { filter } = this.state
    filter[key] = !filter[key]
    this.setState({ filter }, () => this.fetchTokens(true))
  }

  fetchTokens = clear => {
    const { tokens, fetchTokens } = this.props
    const { filter, sortValue } = this.state
    const filterValue = filterToContractParam(filter)
    if (!tokens.loading)
      fetchTokens(
        tokens.data && clear !== true
          ? tokens.data[tokens.data.length - 1].ID
          : '0x00',
        10,
        filterValue,
        sortValue
      )
  }

  render() {
    const { tokens } = this.props
    const { filter } = this.state
    return (
      <div ref={this.ref} className="Page">
        <TitleBar />
        <FilterBar
          filter={filter}
          handleFilterChange={this.handleFilterChange}
        />
        <SortBar />
        <div className="TokenGrid">
          {tokens.data && this.mapTokens(tokens.data)}
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    tokens: state.token.tokens
  }),
  {
    fetchArbitrableTokenListData:
      arbitrableTokenListActions.fetchArbitrableTokenListData,
    fetchTokens: tokenActions.fetchTokens
  }
)(Tokens)
