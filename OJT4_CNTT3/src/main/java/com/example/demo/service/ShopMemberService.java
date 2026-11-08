package com.example.demo.service;

import com.example.demo.dto.request.AddShopMemberRequest;
import com.example.demo.dto.request.UpdateShopMemberRequest;
import com.example.demo.dto.response.ShopMemberResponse;

import java.util.List;

public interface ShopMemberService {
    List<ShopMemberResponse> getShopMembers(Long shopId, String currentUsername);
    ShopMemberResponse addShopMember(Long shopId, AddShopMemberRequest request, String currentUsername);
    ShopMemberResponse updateShopMember(Long shopId, Long memberId, UpdateShopMemberRequest request, String currentUsername);
    void deleteShopMember(Long shopId, Long memberId, String currentUsername);
}
